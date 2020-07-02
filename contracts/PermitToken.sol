// SPDX-License-Identifier: MIT
pragma solidity ^0.6.8;

import { ERC777 } from "@openzeppelin/contracts/token/ERC777/ERC777.sol";

contract PermitToken is ERC777 {

    // EIP712
    bytes32 public DOMAIN_SEPARATOR;
    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;

    mapping(address => uint) public nonces;

    string  public constant version  = "1";

    constructor(uint256 _totalSupply) public ERC777("PermitToken", "PMT", new address[](0))
    {
        uint256 chainId;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            chainId := chainid()
        }

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(name())),
                keccak256(bytes(version)),
                chainId,
                address(this)
            )
        );

        _mint(_msgSender(), _totalSupply, "", "");
    }

    // EIP2612
    function permit(
        address _owner,
        address _spender,
        uint256 _value,
        uint256 _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    )
        external
    {
        // solium-disable-next-line security/no-block-members
        require(_deadline >= block.timestamp, "PermitToken.permit: EXPIRED");
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(PERMIT_TYPEHASH, _owner, _spender, _value, nonces[_owner]++, _deadline))
            )
        );
        address recoveredAddress = ecrecover(digest, _v, _r, _s);
        require(recoveredAddress != address(0) && recoveredAddress == _owner, "PermitToken.permit: INVALID_SIGNATURE");
        _approve(_owner, _spender, _value);
    }
}

