require("dotenv").config();
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const account1 = process.env.PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  networks: {
    goerli: {
      url: "https://eth-goerli.g.alchemy.com/v2/ImKklU5DM_Gsx1f-lkMYg2UlBrEx0ILw",
      accounts: [account1!]
    }
  }
};

export default config;
