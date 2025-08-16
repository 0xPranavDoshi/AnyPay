const { exec } = require('child_process');
const util = require('util');
require("dotenv").config();

const execAsync = util.promisify(exec);

async function deployToNetwork(networkName) {
  console.log(`\n🌐 Deploying to ${networkName}...`);
  
  try {
    const command = `npx hardhat run scripts/deploy-payment-splitter.js --network ${networkName}`;
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('Warning')) {
      throw new Error(stderr);
    }
    
    console.log(stdout);
    
    // Extract contract address from output
    const addressMatch = stdout.match(/Contract Address: (0x[a-fA-F0-9]{40})/);
    const contractAddress = addressMatch ? addressMatch[1] : null;
    
    return {
      network: networkName,
      contractAddress,
      success: true
    };
    
  } catch (error) {
    console.error(`❌ Failed to deploy to ${networkName}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log(`🚀 Deploying CrossChainPaymentSplitterPTT to ALL chains...`);
  console.log(`⏱️  This will take a few minutes...\n`);

  const networks = [
    "ethereumSepolia",
    "arbitrumSepolia", 
    "baseSepolia"
  ];

  const deployments = [];
  const deploymentAddresses = {};

  for (const network of networks) {
    try {
      const result = await deployToNetwork(network);
      deployments.push(result);
      deploymentAddresses[network] = result.contractAddress;
      
      console.log(`✅ ${network}: ${result.contractAddress}`);
    } catch (error) {
      console.error(`❌ Failed to deploy to ${network}:`, error.message);
      throw error;
    }
  }

  console.log(`\n🎉 ALL DEPLOYMENTS COMPLETE!`);
  console.log(`\n📋 Contract Addresses:`);
  console.log(`- Ethereum Sepolia: ${deploymentAddresses.ethereumSepolia}`);
  console.log(`- Arbitrum Sepolia: ${deploymentAddresses.arbitrumSepolia}`);
  console.log(`- Base Sepolia: ${deploymentAddresses.baseSepolia}`);

  // Create deployment summary
  const summary = {
    deployedAt: new Date().toISOString(),
    contracts: deploymentAddresses,
    networks: networks,
    success: true
  };

  console.log(`\n📄 Deployment Summary:`);
  console.log(JSON.stringify(summary, null, 2));

  // Instructions for testing
  console.log(`\n🧪 READY FOR TESTING!`);
  console.log(`\nNext steps:`);
  console.log(`1. Update your .env with these contract addresses:`);
  console.log(`   ETHEREUM_SEPOLIA_CONTRACT="${deploymentAddresses.ethereumSepolia}"`);
  console.log(`   ARBITRUM_SEPOLIA_CONTRACT="${deploymentAddresses.arbitrumSepolia}"`);
  console.log(`   BASE_SEPOLIA_CONTRACT="${deploymentAddresses.baseSepolia}"`);
  console.log(`2. Ensure test accounts have tokens:`);
  console.log(`   - User 1: 1 USDC on Ethereum Sepolia`);
  console.log(`   - User 2: 1 CCIP-BnM on Arbitrum Sepolia`);
  console.log(`   - User 3: 1 USDC on Base Sepolia`);
  console.log(`3. Run: npm run test:cross-chain`);

  return summary;
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(`❌ Multi-chain deployment failed:`, error);
      process.exit(1);
    });
}

module.exports = main;