// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Chronicle} from "../src/Chronicle.sol";

/// Test-only stand-in for the Chog NFT.
contract MockChog is ERC721 {
    constructor() ERC721("MockChog", "MCHOG") {}

    function mint(address to, uint256 id) external {
        _mint(to, id);
    }
}

contract ChronicleTest is Test {
    event NightClaimed(
        uint256 indexed tokenId,
        uint32 indexed day,
        address indexed holder,
        uint16[] itemIds,
        uint64 newXp,
        uint32 newLevel,
        uint32 streak
    );

    MockChog chog;
    Chronicle chronicle;
    address owner = makeAddr("owner");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    uint256 constant TOKEN = 7;
    uint32 constant DAY = 20384;

    function setUp() public {
        chog = new MockChog();
        chronicle = new Chronicle(owner, chog);
        chog.mint(alice, TOKEN);
        vm.warp(uint256(DAY) * 1 days + 3 hours);
    }

    function _record(uint256 id) internal view returns (uint64 xp, uint32 level, uint32 streak, uint32 last, bool claimed) {
        return chronicle.chronicleOf(id);
    }

    // ---------- happy path ----------

    function test_holderClaimsToday_recordsXpItemsAndEvent() public {
        uint16[] memory expected = chronicle.rollNight(TOKEN, DAY);

        vm.expectEmit(true, true, true, true, address(chronicle));
        emit NightClaimed(TOKEN, DAY, alice, expected, 40, 1, 1);
        vm.prank(alice);
        uint16[] memory got = chronicle.claimNight(TOKEN, DAY);

        assertEq(keccak256(abi.encode(got)), keccak256(abi.encode(expected)));
        (uint64 xp, uint32 level, uint32 streak, uint32 last, bool claimed) = _record(TOKEN);
        assertEq(xp, 40);
        assertEq(level, 1);
        assertEq(streak, 1);
        assertEq(last, DAY);
        assertTrue(claimed);
        for (uint256 i; i < expected.length; i++) {
            assertEq(chronicle.itemCount(TOKEN, expected[i]), 1);
        }
    }

    function test_canClaimYesterdaysNight() public {
        vm.prank(alice);
        chronicle.claimNight(TOKEN, DAY - 1);
        (, , , uint32 last, ) = _record(TOKEN);
        assertEq(last, DAY - 1);
    }

    function test_streakGrowsOnConsecutiveDaysAndResetsAfterGap() public {
        vm.startPrank(alice);
        chronicle.claimNight(TOKEN, DAY);
        vm.warp(uint256(DAY + 1) * 1 days);
        chronicle.claimNight(TOKEN, DAY + 1);
        (, , uint32 streak, , ) = _record(TOKEN);
        assertEq(streak, 2);

        vm.warp(uint256(DAY + 5) * 1 days);
        chronicle.claimNight(TOKEN, DAY + 5);
        (, , streak, , ) = _record(TOKEN);
        assertEq(streak, 1);
        vm.stopPrank();
    }

    function test_levelUpsEvery500Xp() public {
        vm.startPrank(alice);
        for (uint32 d; d < 13; d++) {
            vm.warp(uint256(DAY + d) * 1 days);
            chronicle.claimNight(TOKEN, DAY + d);
        }
        vm.stopPrank();
        (uint64 xp, uint32 level, uint32 streak, , ) = _record(TOKEN);
        assertEq(xp, 520);
        assertEq(level, 2);
        assertEq(streak, 13);
    }

    function test_progressFollowsTheNftToANewHolder() public {
        vm.prank(alice);
        chronicle.claimNight(TOKEN, DAY);

        vm.prank(alice);
        chog.transferFrom(alice, bob, TOKEN);

        vm.warp(uint256(DAY + 1) * 1 days);
        vm.prank(alice);
        vm.expectRevert(Chronicle.NotChogHolder.selector);
        chronicle.claimNight(TOKEN, DAY + 1);

        vm.prank(bob);
        chronicle.claimNight(TOKEN, DAY + 1);
        (uint64 xp, , uint32 streak, , ) = _record(TOKEN);
        assertEq(xp, 80);
        assertEq(streak, 2);
    }

    // ---------- rejections ----------

    function test_revert_notHolder() public {
        vm.prank(bob);
        vm.expectRevert(Chronicle.NotChogHolder.selector);
        chronicle.claimNight(TOKEN, DAY);
    }

    function test_revert_unmintedToken() public {
        vm.prank(alice);
        vm.expectRevert();
        chronicle.claimNight(999, DAY);
    }

    function test_revert_sameDayTwice() public {
        vm.startPrank(alice);
        chronicle.claimNight(TOKEN, DAY);
        vm.expectRevert(Chronicle.AlreadyClaimed.selector);
        chronicle.claimNight(TOKEN, DAY);
        vm.stopPrank();
    }

    function test_revert_yesterdayAfterToday() public {
        vm.startPrank(alice);
        chronicle.claimNight(TOKEN, DAY);
        vm.expectRevert(Chronicle.AlreadyClaimed.selector);
        chronicle.claimNight(TOKEN, DAY - 1);
        vm.stopPrank();
    }

    function test_revert_twoDaysAgo() public {
        vm.prank(alice);
        vm.expectRevert(Chronicle.DayNotClaimable.selector);
        chronicle.claimNight(TOKEN, DAY - 2);
    }

    function test_revert_futureDay() public {
        vm.prank(alice);
        vm.expectRevert(Chronicle.DayNotClaimable.selector);
        chronicle.claimNight(TOKEN, DAY + 1);
    }

    function test_revert_whenPaused_andUnpauseRestores() public {
        vm.prank(owner);
        chronicle.pause();
        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        chronicle.claimNight(TOKEN, DAY);

        vm.prank(owner);
        chronicle.unpause();
        vm.prank(alice);
        chronicle.claimNight(TOKEN, DAY);
    }

    function test_revert_onlyOwnerCanPause() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        chronicle.pause();
    }

    // ---------- the roll ----------

    function test_rollIsDeterministic() public view {
        assertEq(
            keccak256(abi.encode(chronicle.rollNight(TOKEN, DAY))),
            keccak256(abi.encode(chronicle.rollNight(TOKEN, DAY)))
        );
    }

    function test_rollShapeOverManyNights() public view {
        uint256 epicNights;
        for (uint32 d; d < 600; d++) {
            uint16[] memory ids = chronicle.rollNight(TOKEN, DAY + d);
            assertGe(ids.length, 1);
            assertLe(ids.length, 3);
            for (uint256 i; i < ids.length; i++) {
                assertGe(ids[i], 1);
                assertLe(ids[i], 21);
                for (uint256 j; j < i; j++) {
                    assertTrue(ids[i] != ids[j], "duplicate item in one night");
                }
            }
            if (ids[0] >= 19) epicNights++;
        }
        // About 1 in 12 nights: 50 expected out of 600.
        assertGt(epicNights, 25);
        assertLt(epicNights, 80);
    }

    function test_fuzz_rollAlwaysValid(uint256 tokenId, uint32 day) public view {
        uint16[] memory ids = chronicle.rollNight(tokenId, day);
        assertGe(ids.length, 1);
        assertLe(ids.length, 3);
        for (uint256 i; i < ids.length; i++) {
            assertGe(ids[i], 1);
            assertLe(ids[i], 21);
        }
    }
}
