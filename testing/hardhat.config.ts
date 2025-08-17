// import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "./tasks";
import "dotenv/config";

const PRIVATE_KEY: string = process.env.PRIVATE_KEY || "";
const ETHEREUM_SEPOLIA_RPC_URL: string = process.env.ETHEREUM_SEPOLIA_RPC || "";
const ARBITRUM_SEPOLIA_RPC_URL: string = process.env.ARBITRUM_SEPOLIA_RPC || "";
const BASE_SEPOLIA_RPC_URL: string = process.env.BASE_SEPOLIA_RPC || "";

const config = {
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
    } as any,
    arbitrumSepolia: {
      url: ARBITRUM_SEPOLIA_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 421614,
    } as any,
    baseSepolia: {
      url: BASE_SEPOLIA_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 84532,
    } as any,
  },
};

export default config;
