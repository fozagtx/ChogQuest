// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Chronicle} from "../src/Chronicle.sol";

/// @notice Deploys Chronicle. The deployer becomes the owner (can pause and unpause).
/// Env: DEPLOYER_PRIVATE_KEY, CHOG_NFT_ADDRESS (optional, defaults to Chog Genesis on Monad mainnet).
contract Deploy is Script {
    address constant CHOG_GENESIS = 0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763;

    function run() external returns (Chronicle chronicle) {
        uint256 deployerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address chogNft = vm.envOr("CHOG_NFT_ADDRESS", CHOG_GENESIS);
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
