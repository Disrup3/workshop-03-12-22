import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect, assert } from "chai";
import { ethers } from "hardhat";

describe("WorldCupbet", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployOneWorldCupBetFixture() {
    const TEAM_LIST: string[] = [
      "Spain",
      "Germany",
      "England",
      "Wales",
      "Japan",
      "Argentina",
      "Japan",
      "Arabia Saudi",
      "Mexico",
      "Poland",
      "Italy",
    ];

    const [owner, user1, user2] = await ethers.getSigners();

    const WorldCupBet = await ethers.getContractFactory("WorldCupBet");
    const worldCupBet = await WorldCupBet.connect(owner).deploy(TEAM_LIST);

    return { worldCupBet, owner, user1, user2 };
  }

  describe("Deployment", function () {
    it("should console log team list initialized in constructor", async () => {
      const { worldCupBet, owner } = await deployOneWorldCupBetFixture();
      assert.lengthOf(await worldCupBet.getTeamList(), 11);
    });
  });

  describe("Betting logic", function () {
    it("should bet team with id 1", async () => {
      const { worldCupBet } = await deployOneWorldCupBetFixture();

      const betTxn = await worldCupBet.bet(0, {
        value: ethers.utils.parseEther("1"),
      });
      expect(betTxn).to.emit(worldCupBet, "WorldCupBet_newBet");
      const amountBettedToId1 = await worldCupBet.getAmountBettedToTeam(0);

      assert(
        amountBettedToId1.toString() ===
          ethers.utils.parseEther("1").toString(),
        "value returned from view function !="
      );
    });

    it("should withdraw the funds", async () => {
      const { worldCupBet, owner, user1, user2 } =
        await deployOneWorldCupBetFixture();
      await worldCupBet.bet(1, { value: ethers.utils.parseEther("1") });
      await worldCupBet
        .connect(user1)
        .bet(0, { value: ethers.utils.parseEther("1") });
      await worldCupBet
        .connect(user2)
        .bet(0, { value: ethers.utils.parseEther("1") });

      await worldCupBet.setWinner(0);

      let user1Balance = await ethers.provider.getBalance(user1.address);
      let user2Balance = await ethers.provider.getBalance(user2.address);
      let user1OwnedAmount = await worldCupBet.getUserProceeds(user1.address);
      let user2OwnedAmount = await worldCupBet.getUserProceeds(user2.address);
      console.log(ethers.utils.formatEther(user1OwnedAmount));

      const withdrawTxn = await worldCupBet.connect(user1).withdraw();
      const withdraw2Txn = await worldCupBet.connect(user2).withdraw();

      const block = await ethers.provider.getBlockNumber();
      const timestamp = await ethers.provider.getBlock(block);
      expect(withdrawTxn)
        .to.emit(worldCupBet, "WorldCupBet__withdrawEarnings")
        .withArgs(owner.address, user1OwnedAmount, timestamp.timestamp);

      expect(withdraw2Txn)
        .to.emit(worldCupBet, "WorldCupBet__withdrawEarnings")
        .withArgs(user2.address, user2OwnedAmount, timestamp.timestamp);

      await user1.sendTransaction({
        to: owner.address,
        value: user1Balance,
      });
      await user2.sendTransaction({
        to: owner.address,
        value: user2Balance,
      });
      expect(
        Math.round(
          ethers.utils.formatEther(
            await ethers.provider.getBalance(user1.address)
          ) * 100
        ) / 100
      ).to.be.equal(Number(ethers.utils.formatEther(user1OwnedAmount)));
      expect(
        Math.round(
          ethers.utils.formatEther(
            await ethers.provider.getBalance(user2.address)
          ) * 100
        ) / 100
      ).to.be.equal(Number(ethers.utils.formatEther(user2OwnedAmount)));

      await expect(worldCupBet.withdraw()).to.be.revertedWith(
        "nothing to withdraw"
      );
    });

    it("should withdraw the funds to owner when no one betted for the winner", async () => {
      const { worldCupBet, owner, user1, user2 } =
        await deployOneWorldCupBetFixture();
      await worldCupBet
        .connect(user1)
        .bet(1, { value: ethers.utils.parseEther("1") });
      await worldCupBet
        .connect(user2)
        .bet(0, { value: ethers.utils.parseEther("1") });

      await worldCupBet.setWinner(3);
      const withdrawTxn = await worldCupBet.withdraw();

      const block = await ethers.provider.getBlockNumber();
      const timestamp = await ethers.provider.getBlock(block);
      expect(withdrawTxn)
        .to.emit(worldCupBet, "WorldCupBet__withdrawEarnings")
        .withArgs(owner.address, 2, timestamp.timestamp);

      await expect(worldCupBet.withdraw()).to.be.revertedWith(
        "something went wrong"
      );
    });
  });

  describe("Reverts", () => {
    it("should revert when trying to bet for a non valid teamId", async () => {
      const { worldCupBet } = await deployOneWorldCupBetFixture();
      await expect(
        worldCupBet.bet(18, { value: 100000000000 })
      ).to.be.revertedWith(
        "team ID must be between 0 and the max teams number"
      );
    });

    it("should not allow normal users to perform admin functions", async () => {
      const { worldCupBet, user1 } = await deployOneWorldCupBetFixture();

      await expect(worldCupBet.connect(user1).setWinner(0)).to.be.revertedWith(
        "Onlyowner: user not owner"
      );
    });

    it("should not allow to bet to a defeated team", async () => {
      const { worldCupBet, owner } = await deployOneWorldCupBetFixture();
      // 1 sec after betting deadline
      await worldCupBet.markDefeatedTeam(0, true);
      await expect(
        worldCupBet.bet(0, { value: ethers.utils.parseEther("1") })
      ).to.be.revertedWith("The team has been defeated");
      await worldCupBet.markDefeatedTeam(0, false);
      worldCupBet.bet(0, { value: ethers.utils.parseEther("1") });
    });

    it("should not allow to bet after deadline", async () => {
      const { worldCupBet, owner } = await deployOneWorldCupBetFixture();
      // 1 sec after betting deadline
      await time.increaseTo(1671379201);
      await expect(
        worldCupBet.bet(0, { value: ethers.utils.parseEther("1") })
      ).to.be.revertedWith("Bet out of time range");
    });
  });
});
