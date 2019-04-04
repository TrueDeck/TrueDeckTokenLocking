const {
  BN,
  expectEvent,
  shouldFail,
  time
} = require("openzeppelin-test-helpers");

require("chai").should();

const ERC20Mock = artifacts.require("ERC20Mock");
const BurnableTimelock = artifacts.require("BurnableTimelock");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

contract("BurnableTimelock", function([
  _,
  minter,
  owner,
  beneficiary,
  ...accounts
]) {
  context("with token", function() {
    beforeEach(async function() {
      this.token = await ERC20Mock.new({ from: minter });
    });

    it("rejects a release time in the past", async function() {
      const pastReleaseTime = (await time.latest()).sub(time.duration.years(1));
      const releaseDelay = time.duration.days(10);
      await shouldFail.reverting(
        BurnableTimelock.new(
          this.token.address,
          beneficiary,
          pastReleaseTime,
          releaseDelay,
          { from: owner }
        )
      );
    });

    it("rejects a release delay less than 10 days", async function() {
      const releaseTime = (await time.latest()).add(time.duration.years(1));
      const releaseDelay = time.duration.days(10).sub(time.duration.seconds(1));
      await shouldFail.reverting(
        BurnableTimelock.new(
          this.token.address,
          beneficiary,
          releaseTime,
          releaseDelay,
          { from: owner }
        )
      );
    });

    it("rejects a release delay more than 45 days", async function() {
      const releaseTime = (await time.latest()).add(time.duration.years(1));
      const releaseDelay = time.duration.days(45).add(time.duration.seconds(1));
      await shouldFail.reverting(
        BurnableTimelock.new(
          this.token.address,
          beneficiary,
          releaseTime,
          releaseDelay,
          { from: owner }
        )
      );
    });

    context("once BurnableTimelock deployed", function() {
      beforeEach(async function() {
        this.releaseTime = (await time.latest()).add(time.duration.years(1));
        this.releaseDelay = time.duration.days(10);
        this.requestTime = this.releaseTime.sub(this.releaseDelay);
        this.tokenBalance = web3.utils.toWei("1000", "ether");

        this.burnableTimelock = await BurnableTimelock.new(
          this.token.address,
          beneficiary,
          this.releaseTime,
          this.releaseDelay,
          { from: owner }
        );

        this.token.transfer(this.burnableTimelock.address, this.tokenBalance, {
          from: minter
        });

        await sleep(100);
      });

      it("can get state", async function() {
        (await this.burnableTimelock.owner()).should.be.equal(owner);
        (await this.burnableTimelock.paused()).should.equal(false);
        (await this.burnableTimelock.token()).should.be.equal(
          this.token.address
        );
        (await this.burnableTimelock.beneficiary()).should.be.equal(
          beneficiary
        );
        (await this.burnableTimelock.releaseTime()).should.be.bignumber.equal(
          this.releaseTime
        );
        (await this.burnableTimelock.releaseDelay()).should.be.bignumber.equal(
          this.releaseDelay
        );
        (await this.burnableTimelock.releaseRequested()).should.equal(false);
        (await this.burnableTimelock.totalBurned()).should.be.bignumber.equal(
          "0"
        );
        (await this.burnableTimelock.tokenBalance()).should.be.bignumber.equal(
          this.tokenBalance
        );
      });

      it("reverts on pausing by non-owner", async function() {
        await shouldFail.reverting(this.burnableTimelock.pause());
      });

      it("pauses successfully", async function() {
        const { logs } = await this.burnableTimelock.pause({ from: owner });

        expectEvent.inLogs(logs, "Paused", {
          account: owner
        });

        (await this.burnableTimelock.paused()).should.equal(true);
      });

      context("when not paused", function() {
        it("reverts on changing beneficiary", async function() {
          await shouldFail.reverting(
            this.burnableTimelock.changeBeneficiary(accounts[0], {
              from: owner
            })
          );
        });

        it("cannot be requested to release before time limit", async function() {
          await time.increaseTo(this.requestTime.sub(time.duration.seconds(5)));
          await shouldFail.reverting(this.burnableTimelock.release());
        });

        it("can be requested to release just after limit", async function() {
          await time.increaseTo(this.requestTime.add(time.duration.seconds(5)));
          const { logs } = await this.burnableTimelock.release({ from: owner });

          expectEvent.inLogs(logs, "ReleaseRequested", {
            account: owner
          });

          (await this.burnableTimelock.releaseRequested()).should.equal(true);
        });

        it("reverts on burning tokens by non-owner", async function() {
          await shouldFail.reverting(
            this.burnableTimelock.burn(web3.utils.toWei("100", "ether"))
          );
        });

        it("reverts on burning 0 tokens", async function() {
          await shouldFail.reverting(
            this.burnableTimelock.burn("0", { from: owner })
          );
        });

        it("reverts on burning more tokens than balance", async function() {
          await shouldFail.reverting(
            this.burnableTimelock.burn(web3.utils.toWei("1001", "ether"), {
              from: owner
            })
          );
        });

        it("locked tokens can still be burned", async function() {
          const burnAmount = web3.utils.toWei("100", "ether");
          const remainingTokenBalance = web3.utils.toWei("900", "ether");

          const { logs } = await this.burnableTimelock.burn(burnAmount, {
            from: owner
          });

          await sleep(100);

          (await this.burnableTimelock.totalBurned()).should.be.bignumber.equal(
            burnAmount
          );
          (await this.burnableTimelock.tokenBalance()).should.be.bignumber.equal(
            remainingTokenBalance
          );
        });

        context("when release has been requested", function() {
          beforeEach(async function() {
            await time.increaseTo(
              this.requestTime.add(time.duration.seconds(5))
            );
            await this.burnableTimelock.release({ from: owner });
          });

          it("reverts on calling release before releaseDelay", async function() {
            await shouldFail.reverting(
              this.burnableTimelock.release({ from: owner })
            );
          });

          it("released after releaseDelay", async function() {
            await time.increaseTo((await time.latest()).add(this.releaseDelay));
            const { logs } = await this.burnableTimelock.release({
              from: owner
            });

            await sleep(100);

            (await this.token.balanceOf(beneficiary)).should.be.bignumber.equal(
              this.tokenBalance
            );
            (await this.burnableTimelock.tokenBalance()).should.be.bignumber.equal(
              "0"
            );
          });
        });
      });

      context("when paused", function() {
        beforeEach(async function() {
          await this.burnableTimelock.pause({ from: owner });
        });

        it("reverts on changing beneficiary by non-owner", async function() {
          await shouldFail.reverting(
            this.burnableTimelock.changeBeneficiary(accounts[0])
          );
        });

        it("changes beneficiary", async function() {
          const newBeneficiary = accounts[0];
          const { logs } = await this.burnableTimelock.changeBeneficiary(
            newBeneficiary,
            { from: owner }
          );

          expectEvent.inLogs(logs, "BeneficiaryChanged", {
            previousAccount: beneficiary,
            newAccount: newBeneficiary
          });

          (await this.burnableTimelock.beneficiary()).should.be.equal(
            newBeneficiary
          );
        });

        it("reverts on release", async function() {
          await time.increaseTo(this.requestTime.add(time.duration.seconds(5)));
          await shouldFail.reverting(this.burnableTimelock.release());
        });

        it("reverts on burn", async function() {
          const burnAmount = web3.utils.toWei("100", "ether");
          await shouldFail.reverting(
            this.burnableTimelock.burn(burnAmount, {
              from: owner
            })
          );
        });
      });
    });
  });
});
