// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title TestChog
/// @notice Free test companions for trying Quest Chog without owning a Chog Genesis NFT.
///         Anyone can mint a few for gas only. These are NOT Chog Genesis NFTs.
/// @dev Token IDs start at FIRST_ID so they never overlap with Chog Genesis IDs (1 to 1969),
///      which lets the app tell the two collections apart by ID alone.
contract TestChog is ERC721 {
    using Strings for uint256;

    uint256 public constant FIRST_ID = 1_000_001;
    uint256 public constant MAX_PER_WALLET = 3;
    uint256 private constant ART_COUNT = 6;

    /// @notice Base URL of the official Chog art the app serves (chog1.jpg ... chognice.jpg).
    string public artBase;
    uint256 public totalSupply;
    mapping(address => uint256) public mintedBy;

    error MintLimitReached();

    constructor(string memory artBase_) ERC721("Test Chog", "TCHOG") {
        artBase = artBase_;
    }

    /// @notice Mint one free Test Chog to the caller.
    function mint() external returns (uint256 tokenId) {
        if (mintedBy[msg.sender] >= MAX_PER_WALLET) revert MintLimitReached();
        mintedBy[msg.sender] += 1;
        tokenId = FIRST_ID + totalSupply;
        totalSupply += 1;
        _mint(msg.sender, tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        string memory number = (tokenId - FIRST_ID + 1).toString();
        string memory json = string.concat(
            '{"name":"Test Chog #',
            number,
            '","description":"A free test companion for trying Quest Chog. Not a Chog Genesis NFT.","image":"',
            artBase,
            _art(tokenId),
            '","attributes":[{"trait_type":"Collection","value":"Test"}]}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    function _art(uint256 tokenId) private pure returns (string memory) {
        uint256 i = (tokenId - FIRST_ID) % ART_COUNT;
        if (i == 0) return "chog1.jpg";
        if (i == 1) return "chog5.jpg";
        if (i == 2) return "chog6.jpg";
        if (i == 3) return "chogwow.jpg";
        if (i == 4) return "chognice.jpg";
        return "chogbadge.jpg";
    }
}
