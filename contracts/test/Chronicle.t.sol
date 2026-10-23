// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Chronicle} from "../src/Chronicle.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract ChronicleTest is Test {
    Chronicle internal chronicle;

    address internal owner = makeAddr("owner");
    address internal relayer = makeAddr("relayer");
    uint256 internal signerPk = 0xA11CE;
    address internal signerAddr;
    uint256 internal otherPk = 0xB0B;

    uint256 internal constant TOKEN = 42;
    uint32 internal constant DAY = 20_384;
    uint32 internal constant MAX_XP = 200;

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

    function setUp() public {
        vm.warp(1_761_177_600);
        signerAddr = vm.addr(signerPk);
        chronicle = new Chronicle(owner, signerAddr, MAX_XP);
    }

    // ------------------------------------------------------------------ helpers

    function _items(uint16 a) internal pure returns (uint16[] memory ids) {
        ids = new uint16[](1);
        ids[0] = a;
    }

    function _items(uint16 a, uint16 b, uint16 c) internal pure returns (uint16[] memory ids) {
        ids = new uint16[](3);
        ids[0] = a;
        ids[1] = b;
        ids[2] = c;
    }

    function _digest(
        uint256 tokenId,
        uint32 day,
        uint16[] memory ids,
        uint32 xpGain,
        uint32 streak,
        uint256 deadline
    ) internal view returns (bytes32) {
        bytes32 typehash = keccak256(
            "NightVoucher(uint256 tokenId,uint32 day,bytes32 itemsHash,uint32 xpGain,uint32 streak,uint256 deadline)"
        );
        bytes32 structHash =
            keccak256(abi.encode(typehash, tokenId, day, keccak256(abi.encodePacked(ids)), xpGain, streak, deadline));
        return keccak256(abi.encodePacked("\x19\x01", chronicle.domainSeparator(), structHash));
    }

    function _sign(
        uint256 pk,
        uint256 tokenId,
        uint32 day,
        uint16[] memory ids,
        uint32 xpGain,
        uint32 streak,
        uint256 deadline
    ) internal view returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, _digest(tokenId, day, ids, xpGain, streak, deadline));
        return abi.encodePacked(r, s, v);
    }

    function _claim(uint32 day, uint16[] memory ids, uint32 xpGain, uint32 streak) internal {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _sign(signerPk, TOKEN, day, ids, xpGain, streak, deadline);
        vm.prank(relayer);
        chronicle.claimNight(TOKEN, day, ids, xpGain, streak, deadline, sig);
    }

    // ------------------------------------------------------------------ domain / hashing

    function test_DomainSeparatorMatchesSpec() public view {
        bytes32 expected = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("QuestChogChronicle"),
                keccak256("1"),
                block.chainid,
                address(chronicle)
            )
        );
        assertEq(chronicle.domainSeparator(), expected);
    }

    function test_HashVoucherMatchesOffchainComputation() public view {
        uint16[] memory ids = _items(1, 2, 3);
        assertEq(chronicle.hashVoucher(TOKEN, DAY, ids, 50, 3, 999), _digest(TOKEN, DAY, ids, 50, 3, 999));
    }

    // ------------------------------------------------------------------ happy path

    function test_ClaimUpdatesStateInventoryAndLevel() public {
        uint16[] memory ids = _items(7, 7, 9);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _sign(signerPk, TOKEN, DAY, ids, 150, 1, deadline);

        vm.expectEmit(true, true, false, true, address(chronicle));
        emit NightClaimed(TOKEN, DAY, ids, 150, 150, 1, 1);
        vm.prank(relayer);
        chronicle.claimNight(TOKEN, DAY, ids, 150, 1, deadline, sig);

        (uint64 xp, uint32 level, uint32 streak, uint32 last, bool claimed) = chronicle.chronicleOf(TOKEN);
        assertEq(xp, 150);
        assertEq(level, 1);
        assertEq(streak, 1);
        assertEq(last, DAY);
        assertTrue(claimed);
        assertEq(chronicle.itemCount(TOKEN, 7), 2);
        assertEq(chronicle.itemCount(TOKEN, 9), 1);
        assertEq(chronicle.itemCount(TOKEN, 8), 0);

        // Accumulate to cross a level boundary: 150 + 200 + 200 = 550 -> level 2.
        _claim(DAY + 1, _items(9), 200, 2);
        _claim(DAY + 2, _items(1), 200, 3);
        (xp, level, streak, last, claimed) = chronicle.chronicleOf(TOKEN);
        assertEq(xp, 550);
        assertEq(level, 2);
        assertEq(streak, 3);
        assertEq(last, DAY + 2);
        assertEq(chronicle.itemCount(TOKEN, 9), 2);
        assertEq(chronicle.itemCount(TOKEN, 1), 1);
    }

    function test_FirstClaimOnDayZeroWorks() public {
        _claim(0, _items(1), 10, 1);
        (,,, uint32 last, bool claimed) = chronicle.chronicleOf(TOKEN);
        assertEq(last, 0);
        assertTrue(claimed);

        // Day 0 cannot be claimed again.
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _sign(signerPk, TOKEN, 0, _items(2), 10, 1, deadline);
        vm.expectRevert(abi.encodeWithSelector(Chronicle.DayAlreadyClaimed.selector, uint32(0), uint32(0)));
        chronicle.claimNight(TOKEN, 0, _items(2), 10, 1, deadline, sig);
    }

    function test_UnclaimedTokenReadsZero() public view {
        (uint64 xp, uint32 level, uint32 streak, uint32 last, bool claimed) = chronicle.chronicleOf(999);
        assertEq(xp, 0);
        assertEq(level, 0);
        assertEq(streak, 0);
        assertEq(last, 0);
        assertFalse(claimed);
    }

    function test_TokensAreIndependent() public {
        _claim(DAY, _items(1), 100, 1);
        uint16[] memory ids = _items(1);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _sign(signerPk, TOKEN + 1, DAY, ids, 100, 1, deadline);
        chronicle.claimNight(TOKEN + 1, DAY, ids, 100, 1, deadline, sig);
        assertEq(chronicle.itemCount(TOKEN + 1, 1), 1);
    }

    // ------------------------------------------------------------------ rejections

    function test_RevertWhen_VoucherReplayed() public {
        uint16[] memory ids = _items(1);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _sign(signerPk, TOKEN, DAY, ids, 100, 1, deadline);
        chronicle.claimNight(TOKEN, DAY, ids, 100, 1, deadline, sig);

        vm.expectRevert(abi.encodeWithSelector(Chronicle.DayAlreadyClaimed.selector, DAY, DAY));
        chronicle.claimNight(TOKEN, DAY, ids, 100, 1, deadline, sig);
    }

    function test_RevertWhen_WrongSigner() public {
        uint16[] memory ids = _items(1);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _sign(otherPk, TOKEN, DAY, ids, 100, 1, deadline);
        vm.expectRevert(Chronicle.InvalidSignature.selector);
        chronicle.claimNight(TOKEN, DAY, ids, 100, 1, deadline, sig);
    }

    function test_RevertWhen_FieldsTamperedAfterSigning() public {
        uint16[] memory ids = _items(1);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _sign(signerPk, TOKEN, DAY, ids, 100, 1, deadline);

        vm.expectRevert(Chronicle.InvalidSignature.selector);
        chronicle.claimNight(TOKEN, DAY, ids, 200, 1, deadline, sig); // xpGain bumped

        vm.expectRevert(Chronicle.InvalidSignature.selector);
        chronicle.claimNight(TOKEN, DAY, _items(2), 100, 1, deadline, sig); // items swapped

        vm.expectRevert(Chronicle.InvalidSignature.selector);
        chronicle.claimNight(TOKEN + 1, DAY, ids, 100, 1, deadline, sig); // other Chog
    }

    function test_RevertWhen_MalformedSignature() public {
        uint256 deadline = block.timestamp + 1 hours;
        vm.expectRevert(Chronicle.InvalidSignature.selector);
        chronicle.claimNight(TOKEN, DAY, _items(1), 100, 1, deadline, hex"1234");
    }

    function test_RevertWhen_DoubleClaimSameDay() public {
        _claim(DAY, _items(1), 100, 1);
        // Fresh, validly signed voucher with different contents for the same day.
        uint16[] memory ids = _items(5);
        uint256 deadline = block.timestamp + 2 hours;
        bytes memory sig = _sign(signerPk, TOKEN, DAY, ids, 50, 1, deadline);
        vm.expectRevert(abi.encodeWithSelector(Chronicle.DayAlreadyClaimed.selector, DAY, DAY));
        chronicle.claimNight(TOKEN, DAY, ids, 50, 1, deadline, sig);
    }

    function test_RevertWhen_EarlierDay() public {
        _claim(DAY, _items(1), 100, 1);
        uint16[] memory ids = _items(1);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _sign(signerPk, TOKEN, DAY - 1, ids, 100, 1, deadline);
        vm.expectRevert(abi.encodeWithSelector(Chronicle.DayAlreadyClaimed.selector, DAY - 1, DAY));
        chronicle.claimNight(TOKEN, DAY - 1, ids, 100, 1, deadline, sig);
    }

    function test_RevertWhen_PausedAndUnpauseRestores() public {
        vm.prank(owner);
        chronicle.pause();

        uint16[] memory ids = _items(1);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _sign(signerPk, TOKEN, DAY, ids, 100, 1, deadline);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        chronicle.claimNight(TOKEN, DAY, ids, 100, 1, deadline, sig);

        vm.prank(owner);
        chronicle.unpause();
        chronicle.claimNight(TOKEN, DAY, ids, 100, 1, deadline, sig);
        (uint64 xp,,,,) = chronicle.chronicleOf(TOKEN);
        assertEq(xp, 100);
    }

    function test_RevertWhen_XpCapExceeded() public {
        uint16[] memory ids = _items(1);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _sign(signerPk, TOKEN, DAY, ids, MAX_XP + 1, 1, deadline);
        vm.expectRevert(abi.encodeWithSelector(Chronicle.XpGainTooHigh.selector, MAX_XP + 1, MAX_XP));
        chronicle.claimNight(TOKEN, DAY, ids, MAX_XP + 1, 1, deadline, sig);

        // Exactly at the cap is fine.
        _claim(DAY, ids, MAX_XP, 1);
    }

    function test_RevertWhen_DeadlinePassed() public {
        uint16[] memory ids = _items(1);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _sign(signerPk, TOKEN, DAY, ids, 100, 1, deadline);
        vm.warp(deadline + 1);
        vm.expectRevert(abi.encodeWithSelector(Chronicle.VoucherExpired.selector, deadline));
        chronicle.claimNight(TOKEN, DAY, ids, 100, 1, deadline, sig);
    }

    function test_RevertWhen_TooManyItems() public {
        uint16[] memory ids = new uint16[](4);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _sign(signerPk, TOKEN, DAY, ids, 100, 1, deadline);
        vm.expectRevert(abi.encodeWithSelector(Chronicle.InvalidItemCount.selector, uint256(4)));
        chronicle.claimNight(TOKEN, DAY, ids, 100, 1, deadline, sig);
    }

    function test_RevertWhen_ZeroItems() public {
        uint16[] memory ids = new uint16[](0);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _sign(signerPk, TOKEN, DAY, ids, 100, 1, deadline);
        vm.expectRevert(abi.encodeWithSelector(Chronicle.InvalidItemCount.selector, uint256(0)));
        chronicle.claimNight(TOKEN, DAY, ids, 100, 1, deadline, sig);
    }

    // ------------------------------------------------------------------ admin

    function test_OnlyOwnerAdminFunctions() public {
        bytes memory err = abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, relayer);
        vm.startPrank(relayer);
        vm.expectRevert(err);
        chronicle.setSigner(relayer);
        vm.expectRevert(err);
        chronicle.pause();
        vm.expectRevert(err);
        chronicle.unpause();
        vm.expectRevert(err);
        chronicle.setMaxXpPerClaim(1000);
        vm.stopPrank();

        vm.startPrank(owner);
        chronicle.setMaxXpPerClaim(1000);
        assertEq(chronicle.maxXpPerClaim(), 1000);
        chronicle.pause();
        assertTrue(chronicle.paused());
        chronicle.unpause();
        assertFalse(chronicle.paused());
        vm.stopPrank();
    }

    function test_RevertWhen_SetSignerZero() public {
        vm.prank(owner);
        vm.expectRevert(Chronicle.ZeroAddress.selector);
        chronicle.setSigner(address(0));
    }

    function test_RevertWhen_ConstructorSignerZero() public {
        vm.expectRevert(Chronicle.ZeroAddress.selector);
        new Chronicle(owner, address(0), MAX_XP);
    }

    function test_SignerRotation() public {
        address newSigner = vm.addr(otherPk);
        vm.expectEmit(true, true, false, false, address(chronicle));
        emit SignerUpdated(signerAddr, newSigner);
        vm.prank(owner);
        chronicle.setSigner(newSigner);
        assertEq(chronicle.signer(), newSigner);

        uint16[] memory ids = _items(1);
        uint256 deadline = block.timestamp + 1 hours;

        // Old signer's voucher no longer accepted.
        bytes memory oldSig = _sign(signerPk, TOKEN, DAY, ids, 100, 1, deadline);
        vm.expectRevert(Chronicle.InvalidSignature.selector);
        chronicle.claimNight(TOKEN, DAY, ids, 100, 1, deadline, oldSig);

        // New signer's voucher works.
        bytes memory newSig = _sign(otherPk, TOKEN, DAY, ids, 100, 1, deadline);
        chronicle.claimNight(TOKEN, DAY, ids, 100, 1, deadline, newSig);
        (uint64 xp,,,,) = chronicle.chronicleOf(TOKEN);
        assertEq(xp, 100);
    }
}
