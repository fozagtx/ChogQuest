// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {TestChog} from "../src/TestChog.sol";
import {Chronicle} from "../src/Chronicle.sol";

/// @notice Deploys the free Test Chog collection and its own Chronicle, so test progress
///         never mixes with real Chog Genesis progress.
/// Env: DEPLOYER_PRIVATE_KEY, TEST_CHOG_ART_BASE (optional).
contract DeployTestChog is Script {
    function run() external returns (TestChog chog, Chronicle chronicle) {
        uint256 deployerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        string memory artBase = vm.envOr("TEST_CHOG_ART_BASE", string("https://questchog.onrender.com/chogs/"));
        address deployer = vm.addr(deployerPk);

        vm.startBroadcast(deployerPk);
        chog = new TestChog(artBase);
        chronicle = new Chronicle(deployer, chog);
        vm.stopBroadcast();

        console.log("TestChog deployed at:", address(chog));
        console.log("Test Chronicle deployed at:", address(chronicle));
        console.log("Owner:", deployer);
        console.log("Chain id:", block.chainid);
    }
}
