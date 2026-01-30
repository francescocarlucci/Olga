const { expect } = require('chai');
const OlgaFactory = artifacts.require("OlgaFactory");
const OlgaDeployable = artifacts.require("OlgaDeployable");

contract("OlgaFactory", (accounts) => {
    const [account0, account1, account2, account3] = accounts;
    let factory;
    const beneficiaries = [account1, account2, account3];
    const unlockYears = 1;
    const epitaph = "Goodbye!";

    beforeEach(async () => {
        factory = await OlgaFactory.new();
    });

    it("should deploy a new OlgaDeployable owned by the caller", async () => {
        const tx = await factory.deployOlga(beneficiaries, unlockYears, epitaph, { from: account0 });
        const olgaAddress = tx.logs[0].args.olga;

        const olga = await OlgaDeployable.at(olgaAddress);
        expect(await olga.owner()).to.equal(account0);
        expect(await olga.beneficiaries(0)).to.equal(account1);
        expect(await olga.beneficiaries(1)).to.equal(account2);
        expect(await olga.beneficiaries(2)).to.equal(account3);
    });

    it("should allow the owner to withdraw from the deployed Olga", async () => {
        const tx = await factory.deployOlga(beneficiaries, unlockYears, epitaph, { from: account0 });
        const olga = await OlgaDeployable.at(tx.logs[0].args.olga);

        // Send 1 ETH to the Olga contract
        const depositAmount = web3.utils.toWei("1", "ether");
        await web3.eth.sendTransaction({ from: account1, to: olga.address, value: depositAmount });

        // Owner withdraws
        const initialBalance = web3.utils.toBN(await web3.eth.getBalance(account0));
        const txWithdraw = await olga.withdraw(depositAmount, { from: account0 });

        const txDetails = await web3.eth.getTransaction(txWithdraw.tx);
        const gasUsed = web3.utils.toBN(txWithdraw.receipt.gasUsed);
        const gasCost = gasUsed.mul(web3.utils.toBN(txDetails.gasPrice));

        const finalBalance = web3.utils.toBN(await web3.eth.getBalance(account0));
        expect(finalBalance.sub(initialBalance).add(gasCost).toString()).to.equal(depositAmount);
    });
});
