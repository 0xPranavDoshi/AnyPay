const hre = require("hardhat");
const deployPaymentSplitter = require("./deploy-payment-splitter.js");

async function main() {
  console.log("🚀 Deploying CrossChainPaymentSplitterPTT with CCIP-LnM support to all chains...\n");

  const networks = ["ethereumSepolia", "arbitrumSepolia", "baseSepolia"];
  const deployments = {};

  for (const networkName of networks) {
    try {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`🌐 Deploying to ${networkName}...`);
      console.log(`${"=".repeat(60)}`);

      // Change network
      hre.changeNetwork(networkName);
      
      // Deploy to this network
      const result = await deployPaymentSplitter();
      
      deployments[networkName] = {
        contractAddress: result.contractAddress,
        network: result.network,
        ...result.addresses
      };

      console.log(`✅ ${networkName} deployment successful!`);
      
    } catch (error) {
      console.error(`❌ Failed to deploy to ${networkName}:`, error.message);
      deployments[networkName] = { error: error.message };
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("📊 DEPLOYMENT SUMMARY");
  console.log(`${"=".repeat(60)}`);

  Object.entries(deployments).forEach(([network, deployment]) => {
    console.log(`\n🌐 ${network.toUpperCase()}:`);
    if (deployment.error) {
      console.log(`❌ Error: ${deployment.error}`);
    } else {
      console.log(`✅ Contract: ${deployment.contractAddress}`);
      console.log(`🔗 Router: ${deployment.router}`);
      console.log(`🪙 USDC: ${deployment.usdc}`);
      console.log(`🪙 CCIP-BnM: ${deployment.ccipBnM}`);
      console.log(`🪙 CCIP-LnM: ${deployment.ccipLnM}`);
    }
  });

  // Generate contract addresses for code update
  console.log(`\n${"=".repeat(60)}`);
  console.log("📝 UPDATE YOUR CODE WITH THESE CONTRACT ADDRESSES:");
  console.log(`${"=".repeat(60)}`);
  
  console.log(`\nconst CONTRACT_ADDRESSES = {`);
  const chainIds = {
    "ethereumSepolia": "11155111",
    "arbitrumSepolia": "421614", 
    "baseSepolia": "84532"
  };
  
  Object.entries(deployments).forEach(([network, deployment]) => {
    const chainId = chainIds[network];
    if (!deployment.error) {
      console.log(`  "${chainId}": "${deployment.contractAddress}", // ${network}`);
    }
  });
  console.log(`};`);

  return deployments;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(`❌ Multi-chain deployment failed:`, error);
      process.exit(1);
    });
}

module.exports = main;