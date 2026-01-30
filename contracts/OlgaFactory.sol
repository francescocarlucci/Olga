// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "./OlgaDeployable.sol";

contract OlgaFactory {
    event OlgaDeployed(address indexed owner, address olga);

    function deployOlga(
        address[] calldata beneficiaries,
        uint256 unlockAfterYears,
        string calldata epitaph
    ) external returns (address) {
        OlgaDeployable olga = new OlgaDeployable(
            payable(msg.sender),
            beneficiaries,
            unlockAfterYears,
            epitaph
        );

        emit OlgaDeployed(msg.sender, address(olga));
        return address(olga);
    }
}
