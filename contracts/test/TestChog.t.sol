// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {TestChog} from "../src/TestChog.sol";
import {Chronicle} from "../src/Chronicle.sol";

contract TestChogTest is Test {
    TestChog chog;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        chog = new TestChog("https://questchog.onrender.com/chogs/");
    }

    function test_mintStartsAboveChogGenesisIds() public {
        vm.prank(alice);
        uint256 id = chog.mint();
        assertEq(id, 1_000_001);
        assertEq(chog.ownerOf(id), alice);
        vm.prank(bob);
        assertEq(chog.mint(), 1_000_002);
        assertEq(chog.totalSupply(), 2);
    }

    function test_mintLimitPerWallet() public {
        vm.startPrank(alice);
        chog.mint();
        chog.mint();
        chog.mint();
        vm.expectRevert(TestChog.MintLimitReached.selector);
        chog.mint();
        vm.stopPrank();
    }

    function test_tokenURIIsLabelledTestWithOfficialArt() public {
        vm.prank(alice);
        uint256 id = chog.mint();
        string memory expected = string.concat(
            '{"name":"Test Chog #1","description":"A free test companion for trying Quest Chog. Not a Chog Genesis NFT.",',
            '"image":"https://questchog.onrender.com/chogs/chog1.jpg","attributes":[{"trait_type":"Collection","value":"Test"}]}'
        );
        assertEq(chog.tokenURI(id), string.concat("data:application/json;base64,", Base64.encode(bytes(expected))));
    }

    function test_revert_tokenURIForUnminted() public {
        vm.expectRevert();
        chog.tokenURI(1_000_001);
    }

    function test_worksWithChronicle() public {
        Chronicle chronicle = new Chronicle(address(this), chog);
        vm.prank(alice);
        uint256 id = chog.mint();
        uint32 today = uint32(block.timestamp / 1 days);
        vm.prank(alice);
        chronicle.claimNight(id, today);
        (uint64 xp, , , , bool claimed) = chronicle.chronicleOf(id);
        assertEq(xp, 40);
        assertTrue(claimed);
        vm.prank(bob);
        vm.expectRevert(Chronicle.NotChogHolder.selector);
        chronicle.claimNight(id, today);
    }
}
