# Olga — A Death-Proof Ethereum Wallet

**Olga** is a minimal Ethereum smart contract that lets a wallet owner secure their ETH with a “dead man’s switch” for their loved ones — a wallet that only opens when time has passed, leaving a final message behind.  

---

## Features

- **Owner-controlled wallet**
  - Deposit, withdraw and use ETH anytime.  
  - Update beneficiaries and unlock period.  

- **Time-based inactivity** 
  - **Every outgoing action by the owner (`withdraw` or `transfer`) automatically resets the timer.**
  - If the contract is used as vault (low activity), `lastAliveCheck` can be updated manually. 
  - After the configurable unlock period without activity, funds can be claimed by designated beneficiaries.  

- **Beneficiaries**
  - Manage a small list of ETH recipients.  
  - Only beneficiaries can perform `finalWithdraw` after the unlock period.  

- **Final withdrawal & epitaph**
  - Transfers all remaining funds to a beneficiary.  
  - Permanently locks the contract — a **last goodbye**, leaving the wallet forever sealed.  
  - Emits a customizable **epitaph message**, a poetic final note from the owner to those left behind.

- **OlgaFactory**
  - Deploy multiple Olga wallets easily.
  - Makes easy to attach a DApp or any front end.  
  - Any wallet can call the factory to create a new Olga for themselves.  
  - Each deployed Olga is independent, owned by the caller, and fully on-chain.  
  - Simplifies deployment without needing predictable addresses or separate deployment scripts.  

- **Events**
  - `Deposit`, `Withdraw`, `Transfer`, `GoodbyeWorld`, `LastAliveUpdated`, `UnlockInYearsUpdated`, `BeneficiariesUpdated` — track the wallet’s life and legacy on-chain.  

---

## Usage

1. Deploy `Olga` with:
   - Beneficiaries list  
   - Unlock period (years)  
   - Epitaph message  

2. Send ETH to fund the wallet.  

3. Owner can:
   - Withdraw or transfer ETH anytime (**resets inactivity timer**)  
   - Update last alive timestamp and beneficiaries  

4. Beneficiaries can:
   - Claim funds via `finalWithdraw` **after the unlock period**, receiving the inheritance and the owner’s final message.  

---

## Deployed on

- **Wallet (mainnet):** [0x42737194f44d3D55903b029Dcf386f6a29a0a6f0](https://etherscan.io/address/0x42737194f44d3d55903b029dcf386f6a29a0a6f0) 
- **Wallet (testnet):** [0x0f0dec9f1fd4154765648537f4695143c2efcf23](https://sepolia.etherscan.io/address/0x0f0dec9f1fd4154765648537f4695143c2efcf23)
- **Factory (mainnet):** [0xd29c733a26aabfc86a0b518c993fc315bbeac2f6](https://etherscan.io/address/0xd29c733a26aabfc86a0b518c993fc315bbeac2f6) 

---

## Security Notes

- Designed for small beneficiary lists (2–4 addresses) for gas efficiency.  
- No reentrancy protection is required due to contract design.  
- Funds are **forever locked after `finalWithdraw`**, preserving the owner’s last wishes and leaving a permanent, immutable legacy.  

A project by [Frenxi](https://francescocarlucci.com/)
