// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

contract OPCNFT is ERC721Enumerable, Ownable {
    using Strings for uint256;
    string public baseURI;

    constructor() ERC721("Optimism Contributor NFTs", "OPCNFT") {}

    function tokenURI(
        uint256 _tokenId
    )
        public
        view
        override
        returns (
            string memory
        )
    {
        require(
            _exists(_tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        return bytes(_baseURI()).length > 0
            ? string(abi.encodePacked(_baseURI(), _tokenId.toString(), ".json"))
            : "";
    }

    function setBaseURI(
        string memory _bURI
    )
        public
        onlyOwner
    {
        baseURI = _bURI;
    }

    function mint(
        address to,
        uint256 tokenId
    )
        public
        onlyOwner
    {
        require(
            tokenId == totalSupply(),
            "OPCNFT: minting wrong token id"
        );

        _mint(to, tokenId);
    }

    function withdraw()
        public
        onlyOwner
    {
        (bool sent,) = msg.sender.call{value: address(this).balance}("");
        if (!sent) {
            revert("OPCNFT: eth send failed");
        }
    }

    function withdrawTokens(
        IERC20 _token
    )
        public
        onlyOwner 
    {
        bool sent = _token.transfer(msg.sender, _token.balanceOf(address(this)));
        if (!sent) {
            revert("OPCNFT: token send failed");
        }
    }

    function _baseURI()
        internal
        override
        view
        returns (
            string memory
        )
    {
        return baseURI;
    }

    function _transfer(
        address,
        address,
        uint256
    )
        internal
        override
        pure
    {
        revert("OPCNFT: this is your special nft! you can't transfer it");
    }
}
