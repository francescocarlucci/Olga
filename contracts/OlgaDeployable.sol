// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract OlgaDeployable {
    address payable public owner;

    address[] public beneficiaries;
    uint256 public unlockAfterYears;
    uint256 public lastAliveCheck;
    bool public lockedForever;
    string public epitaph;
    
    constructor(
        address payable _owner,
        address[] memory _beneficiaries,
        uint256 _unlockAfterYears,
        string memory _epitaph
    ) {
        require(_unlockAfterYears > 0, "Abort: you need to define an unlock period");
        require(_beneficiaries.length > 0, "Abort: you need at least one beneficiary");

        owner = _owner;
        beneficiaries = _beneficiaries;
        unlockAfterYears = _unlockAfterYears * 365 days;
        lastAliveCheck = block.timestamp;
        epitaph = _epitaph;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Abort: caller is not the owner");
        _;
    }

    /// @notice Ensures that the owner is considered dead (unlock period passed)
    modifier onlyIfDead() {
        require(block.timestamp > lastAliveCheck + unlockAfterYears, "Abort: owner is still alive");
        _;
    }

    /// @notice Prevents function execution if the contract has been permanently locked
    /// @dev `lockedForever` is set to true after final withdrawal
    modifier onlyIfNotLockedForever() {
        require(!lockedForever, epitaph);
        _;
    }

    /// @notice Restricts function access to addresses in the `beneficiaries` list
    /// @dev This is O(n) in the number of beneficiaries. Designed for small arrays (2–4). 
    ///      Not gas-optimal for large lists, but acceptable for the use case.
    modifier onlyBeneficiary() {
        bool isBeneficiary = false;
        for (uint i = 0; i < beneficiaries.length; i++) {
            if(beneficiaries[i] == msg.sender) {
                isBeneficiary = true;
                break;
            }
        }
        require(isBeneficiary, "Abort: not a beneficiary");
        _;
    }

    event Deposit(address indexed from, uint256 amount);
    event Withdraw(address indexed to, uint256 amount);
    event Transfer(address indexed to, uint256 amount);
    event LastAliveUpdated(uint256 timestamp);
    event UnlockInYearsUpdated(uint256 unlockYears);
    event BeneficiariesUpdated(address indexed beneficiary, string action);
    event GoodbyeWorld(string message);

    function transfer(address payable _to, uint256 _amount) external onlyOwner {
        require(address(this).balance >= _amount, "Abort: insufficient balance");

        updateLastAlive();

        (bool success, ) = _to.call{value: _amount}("");
        require(success, "Failed: ETH transfer failed");

        emit Transfer(_to, _amount);
    }

    function withdraw(uint256 _amount) external onlyOwner {
        require(_amount <= address(this).balance, "Abort: insufficient balance");

        updateLastAlive();

        (bool success, ) = owner.call{value: _amount}("");
        require(success, "Failed: ETH transfer failed");

        emit Withdraw(owner, _amount);
    }

    function finalWithdraw(address payable _to) external onlyBeneficiary onlyIfDead {
        uint256 balance = address(this).balance;

        (bool success, ) = _to.call{value: balance}("");
        require(success, "Failed: ETH transfer failed");

        lockedForever = true;

        emit Withdraw(_to, balance);
        emit GoodbyeWorld(epitaph);
    }

    function updateLastAlive() public onlyOwner {
        lastAliveCheck = block.timestamp;
        emit LastAliveUpdated(lastAliveCheck);
    }

    function updateUnlockYears(uint256 _unlockInYears) external onlyOwner {
        unlockAfterYears = _unlockInYears * 365 days;
        emit UnlockInYearsUpdated(_unlockInYears);
    }

    function addBeneficiary(address _beneficiary) external onlyOwner {
        beneficiaries.push(_beneficiary);

        emit BeneficiariesUpdated(_beneficiary, "added");
    }

    function removeBeneficiary(address _beneficiary) external onlyOwner {
        require(beneficiaries.length > 1, "Abort: cannot remove last beneficiary");

        for (uint i = 0; i < beneficiaries.length; i++) {
            if (beneficiaries[i] == _beneficiary) {
                beneficiaries[i] = beneficiaries[beneficiaries.length - 1];
                beneficiaries.pop(); // swap and pop

                emit BeneficiariesUpdated(_beneficiary, "removed");
                return;
            }
        }

        revert("Abort: beneficiary not found");
    }

    receive() external payable onlyIfNotLockedForever {
        emit Deposit(msg.sender, msg.value);
    }
}
