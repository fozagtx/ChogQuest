// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Chronicle} from "../src/Chronicle.sol";

/// @notice Deploys Chronicle. The deployer becomes the owner.
/// Env: DEPLOYER_PRIVATE_KEY, VOUCHER_SIGNER_ADDRESS, MAX_XP_PER_CLAIM (optional, default 1000, must match the server cap).
contract Deploy is Script {
    function run() external returns (Chronicle chronicle) {
        uint256 deployerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address voucherSigner = vm.envAddress("VOUCHER_SIGNER_ADDRESS");
        uint256 maxXp = vm.envOr("MAX_XP_PER_CLAIM", uint256(1000));
        require(maxXp <= type(uint32).max, "MAX_XP_PER_CLAIM too large");

        address deployer = vm.addr(deployerPk);

        vm.startBroadcast(deployerPk);
        chronicle = new Chronicle(deployer, voucherSigner, uint32(maxXp));
        vm.stopBroadcast();

        console.log("Chronicle deployed at:", address(chronicle));
        console.log("Owner:", deployer);
        console.log("Voucher signer:", voucherSigner);
        console.log("Max XP per claim:", maxXp);
        console.log("Chain id:", block.chainid);
    }
}
