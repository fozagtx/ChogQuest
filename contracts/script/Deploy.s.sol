// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Chronicle} from "../src/Chronicle.sol";

/// @notice Deploys Chronicle. The deployer becomes the owner (can pause and unpause).
/// Env: DEPLOYER_PRIVATE_KEY, CHOG_NFT_ADDRESS (optional, defaults to Chog Genesis on Monad testnet).
contract Deploy is Script {
    address constant CHOG_GENESIS_TESTNET = 0x11138917b6Dd0782C8Ef98AC7EBB0c3Bd5706ccE;

    function run() external returns (Chronicle chronicle) {
        uint256 deployerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address chogNft = vm.envOr("CHOG_NFT_ADDRESS", CHOG_GENESIS_TESTNET);
        address deployer = vm.addr(deployerPk);

        vm.startBroadcast(deployerPk);
        chronicle = new Chronicle(deployer, IERC721(chogNft));
        vm.stopBroadcast();

        console.log("Chronicle deployed at:", address(chronicle));
        console.log("Owner:", deployer);
        console.log("Chog NFT:", chogNft);
        console.log("Chain id:", block.chainid);
    }
}
