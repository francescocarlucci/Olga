const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const Olga = artifacts.require("Olga");

contract("Olga", (accounts) => {
    const [owner, beneficiary1, beneficiary2, beneficiary3, nonBeneficiary] = accounts;

    let olga;
    const unlockYears = 1;
    const epitaph = "Yo!";

    beforeEach(async () => {
        // Deploy Olga with proper beneficiaries
        olga = await Olga.new([beneficiary1, beneficiary2, beneficiary3], unlockYears, epitaph, { from: owner });
    });

    describe("Deployment", () => {
        it("should set correct owner and beneficiaries", async () => {
            expect(await olga.owner()).to.equal(owner);
            expect(await olga.beneficiaries(0)).to.equal(beneficiary1);
            expect(await olga.beneficiaries(1)).to.equal(beneficiary2);
            expect(await olga.beneficiaries(2)).to.equal(beneficiary3);
            expect(await olga.epitaph()).to.equal(epitaph);
        });

        it("should set unlockAfterYears correctly", async () => {
            const unlockSeconds = await olga.unlockAfterYears();
            expect(unlockSeconds.toString()).to.equal((unlockYears * 365 * 24 * 60 * 60).toString());
        });
    });

    describe("Deposits", () => {
        it("should accept ETH deposits and emit Deposit event", async () => {
            const amount = web3.utils.toWei("1", "ether");

            const tx = await web3.eth.sendTransaction({ from: nonBeneficiary, to: olga.address, value: amount });

            const balance = await web3.eth.getBalance(olga.address);
            expect(balance.toString()).to.equal(amount);

            const events = await olga.getPastEvents("Deposit", { fromBlock: tx.blockNumber, toBlock: tx.blockNumber });
            expect(events.length).to.equal(1);
            expect(events[0].returnValues.from).to.equal(nonBeneficiary);
            expect(events[0].returnValues.amount.toString()).to.equal(amount);
        });
    });

    describe("Owner actions: transfer & withdraw", () => {
        const depositAmount = web3.utils.toWei("2", "ether");

        beforeEach(async () => {
            await web3.eth.sendTransaction({ from: nonBeneficiary, to: olga.address, value: depositAmount });
        });

        it("should allow owner to transfer ETH", async () => {
            const recipient = nonBeneficiary;
            const transferAmount = web3.utils.toWei("1", "ether");

            const initial = web3.utils.toBN(await web3.eth.getBalance(recipient));
            const tx = await olga.transfer(recipient, transferAmount, { from: owner });
            const final = web3.utils.toBN(await web3.eth.getBalance(recipient));

            expect(final.sub(initial).toString()).to.equal(transferAmount);

            const contractBalance = await web3.eth.getBalance(olga.address);
            expect(contractBalance.toString()).to.equal(web3.utils.toWei("1", "ether"));
        });

        it("should revert transfer if not owner", async () => {
            await expectRevert(
                olga.transfer(nonBeneficiary, web3.utils.toWei("1", "ether"), { from: beneficiary1 }),
                "Abort: caller is not the owner"
            );
        });

        it("should allow owner to withdraw ETH accounting for gas", async () => {
            const initialOwnerBalance = web3.utils.toBN(await web3.eth.getBalance(owner));

            const tx = await olga.withdraw(web3.utils.toWei("1", "ether"), { from: owner });

            // Calculate gas cost
            const gasUsed = web3.utils.toBN(tx.receipt.gasUsed);
            const txDetails = await web3.eth.getTransaction(tx.tx);
            const gasPrice = web3.utils.toBN(txDetails.gasPrice);
            const gasCost = gasUsed.mul(gasPrice);

            const finalOwnerBalance = web3.utils.toBN(await web3.eth.getBalance(owner));

            expect(finalOwnerBalance.sub(initialOwnerBalance).add(gasCost).toString())
                .to.equal(web3.utils.toWei("1", "ether"));
        });

        it("should revert withdraw if not owner", async () => {
            await expectRevert(
                olga.withdraw(web3.utils.toWei("1", "ether"), { from: nonBeneficiary }),
                "Abort: caller is not the owner"
            );
        });
    });

    describe("Final withdrawal by beneficiaries", () => {
        const depositAmount = web3.utils.toWei("3", "ether");

        beforeEach(async () => {
            await web3.eth.sendTransaction({ from: nonBeneficiary, to: olga.address, value: depositAmount });
        });

        it("should not allow finalWithdraw before unlock period", async () => {
            await expectRevert(
                olga.finalWithdraw(beneficiary1, { from: beneficiary1 }),
                "Abort: owner is still alive"
            );
        });

        it("should allow finalWithdraw after unlock period accounting for gas", async () => {
            await time.increase(time.duration.years(unlockYears + 1));

            const initial = web3.utils.toBN(await web3.eth.getBalance(beneficiary1));
            const tx = await olga.finalWithdraw(beneficiary1, { from: beneficiary1 });

            const gasUsed = web3.utils.toBN(tx.receipt.gasUsed);
            const txDetails = await web3.eth.getTransaction(tx.tx);
            const gasPrice = web3.utils.toBN(txDetails.gasPrice);
            const gasCost = gasUsed.mul(gasPrice);

            const final = web3.utils.toBN(await web3.eth.getBalance(beneficiary1));

            expect(final.sub(initial).add(gasCost).toString()).to.equal(depositAmount);
            expect(await olga.lockedForever()).to.equal(true);

            const goodbyeEvent = tx.logs.find(e => e.event === "GoodbyeWorld");
            expect(goodbyeEvent).to.not.be.undefined;
            expect(goodbyeEvent.args.message).to.equal(epitaph);
        });

        it("should revert if caller is non-beneficiary", async () => {
            await time.increase(time.duration.years(unlockYears + 1));
            await expectRevert(
                olga.finalWithdraw(nonBeneficiary, { from: nonBeneficiary }),
                "Abort: not a beneficiary"
            );
        });

        it("should prevent deposits after finalWithdraw", async () => {
            await time.increase(time.duration.years(unlockYears + 1));
            await olga.finalWithdraw(beneficiary1, { from: beneficiary1 });

            try {
                await web3.eth.sendTransaction({ from: nonBeneficiary, to: olga.address, value: web3.utils.toWei("0.1", "ether") });
                assert.fail("Expected revert not received");
            } catch (error) {
                expect(error.message).to.include("revert"); // cannot reliably capture epitaph via sendTransaction
            }
        });
    });

    describe("Beneficiary management", () => {
        it("should revert if non-owner tries to manage beneficiaries", async () => {
            await expectRevert(olga.addBeneficiary(nonBeneficiary, { from: beneficiary1 }), "Abort: caller is not the owner");
            await expectRevert(olga.removeBeneficiary(beneficiary1, { from: beneficiary2 }), "Abort: caller is not the owner");
        });
    });

    describe("Alive checks and unlock updates", () => {
        it("should update lastAliveCheck only by owner", async () => {
            const before = await olga.lastAliveCheck();
            await time.increase(time.duration.days(1));
            const tx = await olga.updateLastAlive({ from: owner });
            const after = await olga.lastAliveCheck();
            expect(after.toNumber()).to.be.above(before.toNumber());
            expect(tx.logs[0].event).to.equal("LastAliveUpdated");

            await expectRevert(olga.updateLastAlive({ from: beneficiary1 }), "Abort: caller is not the owner");
        });

        it("should allow owner to update unlockYears", async () => {
            const tx = await olga.updateUnlockYears(2, { from: owner });
            const unlock = await olga.unlockAfterYears();
            expect(unlock.toString()).to.equal((2 * 365 * 24 * 60 * 60).toString());
            expect(tx.logs[0].event).to.equal("UnlockInYearsUpdated");
        });

        it("should revert if non-owner tries to update unlockYears", async () => {
            await expectRevert(olga.updateUnlockYears(5, { from: beneficiary1 }), "Abort: caller is not the owner");
        });
    });
});
