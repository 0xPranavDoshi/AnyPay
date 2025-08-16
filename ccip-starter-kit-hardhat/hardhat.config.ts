import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "./tasks";
import "dotenv/config";

const PRIVATE_KEY: string = process.env.PRIVATE_KEY || "";
const ETHEREUM_SEPOLIA_RPC_URL: string = process.env.ETHEREUM_SEPOLIA_RPC_URL || "";
const ARBITRUM_SEPOLIA_RPC_URL: string = process.env.ARBITRUM_SEPOLIA_RPC_URL || "";
const BASE_SEPOLIA_RPC_URL: string = process.env.BASE_SEPOLIA_RPC_URL || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      evmVersion: "paris",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    ethereumSepolia: {
      url: ETHEREUM_SEPOLIA_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111,
    },
    arbitrumSepolia: {
      url: ARBITRUM_SEPOLIA_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 421614,
    },
    baseSepolia: {
      url: BASE_SEPOLIA_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 84532,
    },
  },
};

export default config;
