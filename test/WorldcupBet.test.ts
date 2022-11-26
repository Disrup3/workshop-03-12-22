import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("WorldCupbet", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployOneWorldCupBetFixture() {

    const TEAM_LIST: string[] = ["Spain", "Germany", "England", "Wales", "Japan", "Argentina", 
    "Japan", "Arabia Saudi", "Mexico", "Poland", "Italy", "12", "13", "14", "15", "16"];
    const ONE_GWEI = 1_000_000_000;
    const [owner, user1, user2] = await ethers.getSigners()

    const WorldCupBet = await ethers.getContractFactory("WorldCupBet");
    const worldCupBet = await WorldCupBet.connect(owner).deploy(TEAM_LIST);

    return { worldCupBet, owner, user1, user2 };
  }

  describe("Deployment", function () {
    it("should console log team list initialized in constructor",async () => {
      const {worldCupBet, owner} = await deployOneWorldCupBetFixture();
      
      console.log(await worldCupBet.getTeamList());
    })
  });

});
