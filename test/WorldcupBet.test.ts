import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect, assert } from "chai";
import { ethers } from "hardhat";

describe("TeamsBet", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployOneTeamsBetFixture() {
    const DEADLINE = 1676981460;
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

    const teamsBet = await ethers.getContractFactory("TeamsBet");
    const TeamsBet = await teamsBet.connect(owner).deploy(TEAM_LIST, DEADLINE);

    return { TeamsBet, owner, user1, user2 };
  }

  describe("Deployment", function () {
    it("should console log team list initialized in constructor", async () => {
      const { TeamsBet, owner } = await deployOneTeamsBetFixture();
      assert.lengthOf(await TeamsBet.getTeamList(), 11);
    });
  });

  describe("Betting logic", function () {
    it("should bet team with id 1", async () => {
      const { TeamsBet } = await deployOneTeamsBetFixture();

      const betTxn = await TeamsBet.bet(0, {
        value: ethers.utils.parseEther("1"),
      });
      expect(betTxn).to.emit(TeamsBet, "TeamsBet_newBet");
      const amountBettedToId1 = await TeamsBet.getAmountBettedToTeam(0);

      assert(
        amountBettedToId1.toString() ===
          ethers.utils.parseEther("1").toString(),
        "value returned from view function !="
      );
    });

    it("should withdraw the funds", async () => {
      const { TeamsBet, owner, user1, user2 } =
        await deployOneTeamsBetFixture();
      await TeamsBet.bet(1, { value: ethers.utils.parseEther("10") });
      await TeamsBet.connect(user1).bet(0, {
        value: ethers.utils.parseEther("1"),
      });

      await time.increaseTo(1676937318);

      await TeamsBet.connect(user2).bet(0, {
        value: ethers.utils.parseEther("1"),
      });

      await TeamsBet.setWinner(0);

      let user1Balance = await ethers.provider.getBalance(user1.address);
      let user2Balance = await ethers.provider.getBalance(user2.address);
      let user1OwnedAmount = await TeamsBet.getUserProceeds(user1.address);
      let user2OwnedAmount = await TeamsBet.getUserProceeds(user2.address);
      console.log(ethers.utils.formatEther(user1OwnedAmount));
      console.log(ethers.utils.formatEther(user2OwnedAmount));

      const withdrawTxn = await TeamsBet.connect(user1).withdraw();
      const withdraw2Txn = await TeamsBet.connect(user2).withdraw();

      const block = await ethers.provider.getBlockNumber();
      const timestamp = await ethers.provider.getBlock(block);
      expect(withdrawTxn)
        .to.emit(TeamsBet, "TeamsBet__withdrawEarnings")
        .withArgs(owner.address, user1OwnedAmount, timestamp.timestamp);

      expect(withdraw2Txn)
        .to.emit(TeamsBet, "TeamsBet__withdrawEarnings")
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
        Math.round(Number(ethers.utils.formatEther(user1OwnedAmount)) * 100) /
          100
      ).to.be.equal(7.56);
      expect(
        Math.round(Number(ethers.utils.formatEther(user2OwnedAmount)) * 100) /
          100
      ).to.be.equal(3.15);

      await expect(TeamsBet.withdraw()).to.be.revertedWith(
        "nothing to withdraw"
      );
    });

    it("should withdraw the funds to owner when no one betted for the winner", async () => {
      const { TeamsBet, owner, user1, user2 } =
        await deployOneTeamsBetFixture();
      await TeamsBet.connect(user1).bet(1, {
        value: ethers.utils.parseEther("1"),
      });
      await TeamsBet.connect(user2).bet(0, {
        value: ethers.utils.parseEther("1"),
      });

      await TeamsBet.setWinner(3);
      const withdrawTxn = await TeamsBet.withdraw();

      const block = await ethers.provider.getBlockNumber();
      const timestamp = await ethers.provider.getBlock(block);
      expect(withdrawTxn)
        .to.emit(TeamsBet, "TeamsBet__withdrawEarnings")
        .withArgs(owner.address, 2, timestamp.timestamp);

      await expect(TeamsBet.withdraw()).to.be.revertedWith(
        "something went wrong"
      );
    });
  });

  describe("Reverts", () => {
    it("should revert when trying to bet for a non valid teamId", async () => {
      const { TeamsBet } = await deployOneTeamsBetFixture();
      await expect(
        TeamsBet.bet(18, { value: 100000000000 })
      ).to.be.revertedWith(
        "team ID must be between 0 and the max teams number"
      );
    });

    it("should not allow normal users to perform admin functions", async () => {
      const { TeamsBet, user1 } = await deployOneTeamsBetFixture();

      await expect(TeamsBet.connect(user1).setWinner(0)).to.be.revertedWith(
        "Onlyowner: user not owner"
      );
    });

    it("should not allow to bet to a defeated team", async () => {
      const { TeamsBet, owner } = await deployOneTeamsBetFixture();
      // 1 sec after betting deadline
      await TeamsBet.markDefeatedTeam(0, true);
      await expect(
        TeamsBet.bet(0, { value: ethers.utils.parseEther("1") })
      ).to.be.revertedWith("The team has been defeated");
      await TeamsBet.markDefeatedTeam(0, false);
      TeamsBet.bet(0, { value: ethers.utils.parseEther("1") });
    });

    it("should not allow to bet after deadline", async () => {
      const { TeamsBet, owner } = await deployOneTeamsBetFixture();
      // 1 sec after betting deadline
      await time.increaseTo(1677067860);
      await expect(
        TeamsBet.bet(0, { value: ethers.utils.parseEther("1") })
      ).to.be.revertedWith("Bet out of time range");
    });
  });
});
