import { ethers } from "hardhat";

async function main() {
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
    "12",
    "13",
    "14",
    "15",
    "16",
  ];
  //todo deploy function goes here
  const teamsBet = await ethers.getContractFactory("TeamsBet");
  const TeamsBet = await teamsBet.deploy(TEAM_LIST, 1676981460);

  await TeamsBet.deployed();
  console.log("Contract deployed to " + TeamsBet.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
