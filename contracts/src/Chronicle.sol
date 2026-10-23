// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

/// @title Chronicle
/// @notice Public, append-only record of each Chog's nightly progress in the Quest Chog game.
///         Every Chog NFT token ID has an XP total, a level, a streak, the last day it claimed,
///         and an inventory of item counts. The contract holds no funds and mints no tokens.
/// @dev Progress is written through EIP-712 vouchers signed by a trusted off-chain `signer`.
///      `claimNight` does NOT check `msg.sender`: anyone (typically a gas-paying relayer) may
///      submit a voucher. Ownership of the Chog NFT is verified server-side before the voucher
///      is signed, so the signer is a trusted party. Replay is prevented by requiring the
///      voucher's `day` to be strictly greater than the token's last claimed day.
contract Chronicle is Ownable, Pausable, EIP712 {
    /// @notice XP required per level. level = 1 + xp / LEVEL_XP.
    uint64 public constant LEVEL_XP = 500;

    /// @notice Maximum number of items a single night voucher may grant.
    uint256 public constant MAX_ITEMS_PER_CLAIM = 3;

    /// @notice EIP-712 typehash for the night voucher.
    bytes32 public constant NIGHT_VOUCHER_TYPEHASH = keccak256(
        "NightVoucher(uint256 tokenId,uint32 day,bytes32 itemsHash,uint32 xpGain,uint32 streak,uint256 deadline)"
    );

    /// @dev Packed into a single storage slot (8 + 4 + 4 + 4 + 1 bytes).
    struct Record {
        uint64 xp;
        uint32 level;
        uint32 streak;
        uint32 lastClaimDay;
        bool claimed;
    }

    /// @notice Address whose signatures authorize night claims.
    address public signer;

    /// @notice Upper bound on `xpGain` for a single claim.
    uint32 public maxXpPerClaim;

    mapping(uint256 tokenId => Record) private _records;
    mapping(uint256 tokenId => mapping(uint16 itemId => uint32 count)) private _inventory;

    event NightClaimed(
        uint256 indexed tokenId,
        uint32 indexed day,
        uint16[] itemIds,
        uint32 xpGain,
        uint64 newXp,
        uint32 newLevel,
        uint32 streak
    );
    event SignerUpdated(address indexed previousSigner, address indexed newSigner);
    event MaxXpPerClaimUpdated(uint32 previousMax, uint32 newMax);

    error ZeroAddress();
    error VoucherExpired(uint256 deadline);
    error InvalidItemCount(uint256 count);
    error XpGainTooHigh(uint32 xpGain, uint32 maxXpPerClaim);
    error InvalidSignature();
    error DayAlreadyClaimed(uint32 day, uint32 lastClaimDay);

    /// @param initialOwner Admin able to rotate the signer, pause, and set the XP cap.
    /// @param initialSigner Trusted voucher signer (the game server key).
    /// @param initialMaxXpPerClaim Cap on XP granted per claim.
    constructor(address initialOwner, address initialSigner, uint32 initialMaxXpPerClaim)
        Ownable(initialOwner)
        EIP712("QuestChogChronicle", "1")
    {
        if (initialSigner == address(0)) revert ZeroAddress();
        signer = initialSigner;
        maxXpPerClaim = initialMaxXpPerClaim;
        emit SignerUpdated(address(0), initialSigner);
        emit MaxXpPerClaimUpdated(0, initialMaxXpPerClaim);
    }

    // ---------------------------------------------------------------------
    // Claims
    // ---------------------------------------------------------------------

    /// @notice Record one night of progress for a Chog.
    /// @dev Callable by anyone (relayer). The caller is intentionally not checked: the server
    ///      verifies NFT ownership before signing, and the voucher binds every field.
    ///      At most one claim per token per day; days must strictly increase, which also
    ///      makes every voucher single-use.
    /// @param tokenId Chog NFT token ID.
    /// @param day Days since unix epoch (UTC) this night belongs to.
    /// @param itemIds Items found this night (1 to 3 entries; duplicates allowed and counted).
    /// @param xpGain XP earned this night (must be <= maxXpPerClaim).
    /// @param streak New streak value computed by the server.
    /// @param deadline Unix timestamp after which the voucher is invalid.
    /// @param signature EIP-712 signature by `signer` over the NightVoucher.
    function claimNight(
        uint256 tokenId,
        uint32 day,
        uint16[] calldata itemIds,
        uint32 xpGain,
        uint32 streak,
        uint256 deadline,
        bytes calldata signature
    ) external whenNotPaused {
        if (block.timestamp > deadline) revert VoucherExpired(deadline);
        uint256 n = itemIds.length;
        if (n == 0 || n > MAX_ITEMS_PER_CLAIM) revert InvalidItemCount(n);
        if (xpGain > maxXpPerClaim) revert XpGainTooHigh(xpGain, maxXpPerClaim);

        Record storage r = _records[tokenId];
        if (r.claimed && day <= r.lastClaimDay) revert DayAlreadyClaimed(day, r.lastClaimDay);

        _verify(hashVoucher(tokenId, day, itemIds, xpGain, streak, deadline), signature);

        (uint64 newXp, uint32 newLevel) = _record(r, day, xpGain, streak);
        _addItems(tokenId, itemIds);

        emit NightClaimed(tokenId, day, itemIds, xpGain, newXp, newLevel, streak);
    }

    function _verify(bytes32 digest, bytes calldata signature) private view {
        (address recovered, ECDSA.RecoverError err,) = ECDSA.tryRecover(digest, signature);
        if (err != ECDSA.RecoverError.NoError || recovered != signer) revert InvalidSignature();
    }

    function _record(Record storage r, uint32 day, uint32 xpGain, uint32 streak)
        private
        returns (uint64 newXp, uint32 newLevel)
    {
        newXp = r.xp + xpGain;
        newLevel = SafeCast.toUint32(1 + newXp / LEVEL_XP);
        r.xp = newXp;
        r.level = newLevel;
        r.streak = streak;
        r.lastClaimDay = day;
        r.claimed = true;
    }

    function _addItems(uint256 tokenId, uint16[] calldata itemIds) private {
        mapping(uint16 => uint32) storage inv = _inventory[tokenId];
        uint256 n = itemIds.length;
        for (uint256 i; i < n; ++i) {
            inv[itemIds[i]] += 1;
        }
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    /// @notice Rotate the voucher signer. Outstanding vouchers from the old signer stop working.
    function setSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert ZeroAddress();
        emit SignerUpdated(signer, newSigner);
        signer = newSigner;
    }

    /// @notice Set the per-claim XP cap.
    function setMaxXpPerClaim(uint32 newMax) external onlyOwner {
        emit MaxXpPerClaimUpdated(maxXpPerClaim, newMax);
        maxXpPerClaim = newMax;
    }

    /// @notice Halt all claims.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Resume claims.
    function unpause() external onlyOwner {
        _unpause();
    }

    // ---------------------------------------------------------------------
    // Reads
    // ---------------------------------------------------------------------

    /// @notice Full chronicle for a Chog. `level` is 0 until the first claim.
    function chronicleOf(uint256 tokenId)
        external
        view
        returns (uint64 xp, uint32 level, uint32 streak, uint32 lastClaimDay, bool hasClaimed)
    {
        Record memory r = _records[tokenId];
        return (r.xp, r.level, r.streak, r.lastClaimDay, r.claimed);
    }

    /// @notice How many of `itemId` the Chog has collected.
    function itemCount(uint256 tokenId, uint16 itemId) external view returns (uint32) {
        return _inventory[tokenId][itemId];
    }

    /// @notice EIP-712 digest a signer must sign for the given voucher fields.
    /// @dev itemsHash = keccak256(abi.encodePacked(itemIds)). Note: Solidity pads array elements
    ///      to 32 bytes inside encodePacked, so this equals keccak256 of the concatenated
    ///      32-byte big-endian words (viem: keccak256(encodePacked(["uint16[]"], [itemIds]))).
    function hashVoucher(
        uint256 tokenId,
        uint32 day,
        uint16[] calldata itemIds,
        uint32 xpGain,
        uint32 streak,
        uint256 deadline
    ) public view returns (bytes32) {
        bytes32 itemsHash = keccak256(abi.encodePacked(itemIds));
        bytes32 structHash =
            keccak256(abi.encode(NIGHT_VOUCHER_TYPEHASH, tokenId, day, itemsHash, xpGain, streak, deadline));
        return _hashTypedDataV4(structHash);
    }

    /// @notice EIP-712 domain separator for this deployment.
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
