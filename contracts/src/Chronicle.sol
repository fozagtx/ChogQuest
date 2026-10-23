// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title Chronicle
/// @notice Public record of each Chog's nights in Quest Chog. Every Chog token ID has an XP
///         total, a level, a claim streak, the last day it claimed, and an item inventory.
///         The contract holds no funds and mints no tokens.
/// @dev No trusted signer or relayer: the Chog's current holder calls `claimNight` from their
///      own wallet, the contract checks ownership on the Chog NFT, and it rolls the night's
///      items itself from (tokenId, day). The roll is public and deterministic, so the app shows
///      the same items before the claim by calling `rollNight`. Days are UTC days since the
///      unix epoch. A night can be claimed on its day or the day after.
contract Chronicle is Ownable, Pausable {
    /// @notice XP added per claimed night.
    uint64 public constant CLAIM_XP = 40;
    /// @notice XP per level. level = 1 + xp / LEVEL_XP.
    uint64 public constant LEVEL_XP = 500;
    /// @notice About 1 in EPIC_ODDS nights brings back an EPIC item.
    uint256 public constant EPIC_ODDS = 12;
    /// @notice Chance (percent) that a non-epic item is RARE.
    uint256 public constant RARE_PERCENT = 25;

    // Item ids by rarity. Must match lib/items.ts in the app. Never renumber, only append.
    uint16 private constant COMMON_FIRST = 1;
    uint16 private constant COMMON_COUNT = 12;
    uint16 private constant RARE_FIRST = 13;
    uint16 private constant RARE_COUNT = 6;
    uint16 private constant EPIC_FIRST = 19;
    uint16 private constant EPIC_COUNT = 3;

    /// @dev Packed into one storage slot.
    struct Record {
        uint64 xp;
        uint32 level;
        uint32 streak;
        uint32 lastClaimDay;
        bool claimed;
    }

    /// @notice The Chog NFT collection whose holders may claim.
    IERC721 public immutable chog;

    mapping(uint256 tokenId => Record) private _records;
    mapping(uint256 tokenId => mapping(uint16 itemId => uint32 count)) private _inventory;

    event NightClaimed(
        uint256 indexed tokenId,
        uint32 indexed day,
        address indexed holder,
        uint16[] itemIds,
        uint64 newXp,
        uint32 newLevel,
        uint32 streak
    );

    error NotChogHolder();
    error DayNotClaimable();
    error AlreadyClaimed();

    constructor(address initialOwner, IERC721 chogNft) Ownable(initialOwner) {
        chog = chogNft;
    }

    /// @notice Current UTC day number.
    function today() public view returns (uint32) {
        return uint32(block.timestamp / 1 days);
    }

    /// @notice Claim a Chog's night. Only the Chog's current holder can call it.
    /// @param tokenId Chog token ID.
    /// @param day The night's day: today, or yesterday if it was not claimed yet.
    function claimNight(uint256 tokenId, uint32 day) external whenNotPaused returns (uint16[] memory itemIds) {
        if (chog.ownerOf(tokenId) != msg.sender) revert NotChogHolder();
        uint32 t = today();
        if (day != t && day + 1 != t) revert DayNotClaimable();

        Record storage r = _records[tokenId];
        if (r.claimed && day <= r.lastClaimDay) revert AlreadyClaimed();

        itemIds = rollNight(tokenId, day);
        mapping(uint16 => uint32) storage inv = _inventory[tokenId];
        for (uint256 i; i < itemIds.length; i++) {
            inv[itemIds[i]] += 1;
        }

        r.streak = (r.claimed && r.lastClaimDay + 1 == day) ? r.streak + 1 : 1;
        r.xp += CLAIM_XP;
        r.level = uint32(1 + r.xp / LEVEL_XP);
        r.lastClaimDay = day;
        r.claimed = true;

        emit NightClaimed(tokenId, day, msg.sender, itemIds, r.xp, r.level, r.streak);
    }

    /// @notice The items a Chog brings back on a given night: 1 to 3 distinct item ids.
    function rollNight(uint256 tokenId, uint32 day) public pure returns (uint16[] memory ids) {
        bytes32 seed = keccak256(abi.encode(tokenId, day));
        uint256 count = 1 + (_rand(seed, 0) % 3);
        bool epicNight = _rand(seed, 1) % EPIC_ODDS == 0;

        ids = new uint16[](count);
        for (uint256 k; k < count; k++) {
            uint16 first;
            uint16 size;
            if (epicNight && k == 0) {
                (first, size) = (EPIC_FIRST, EPIC_COUNT);
            } else if (_rand(seed, 2 + 2 * k) % 100 < RARE_PERCENT) {
                (first, size) = (RARE_FIRST, RARE_COUNT);
            } else {
                (first, size) = (COMMON_FIRST, COMMON_COUNT);
            }
            uint16 offset = uint16(_rand(seed, 3 + 2 * k) % size);
            // Keep a night's items distinct. Pools hold at least 3 items, so this ends.
            while (_contains(ids, k, first + offset)) {
                offset = (offset + 1) % size;
            }
            ids[k] = first + offset;
        }
    }

    /// @notice A Chog's record. `claimed` is false until its first claim.
    function chronicleOf(uint256 tokenId)
        external
        view
        returns (uint64 xp, uint32 level, uint32 streak, uint32 lastClaimDay, bool claimed)
    {
        Record memory r = _records[tokenId];
        return (r.xp, r.level, r.streak, r.lastClaimDay, r.claimed);
    }

    /// @notice How many of an item a Chog has collected.
    function itemCount(uint256 tokenId, uint16 itemId) external view returns (uint32) {
        return _inventory[tokenId][itemId];
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _rand(bytes32 seed, uint256 i) private pure returns (uint256) {
        return uint256(keccak256(abi.encode(seed, i)));
    }

    function _contains(uint16[] memory ids, uint256 len, uint16 id) private pure returns (bool) {
        for (uint256 i; i < len; i++) {
            if (ids[i] == id) return true;
        }
        return false;
    }
}
