const hre = require("hardhat");
require("dotenv").config();

// Test scenarios configuration
const TEST_SCENARIOS = [
  {
    name: "User1 → User3: USDC (Ethereum → Base)",
    payer: {
      privateKey: process.env.USER1_PRIVATE_KEY,
      address: process.env.USER1_ADDRESS,
      sourceChain: "ethereumSepolia",
      token: "USDC"
    },
    recipient: {
      address: process.env.USER3_ADDRESS,
      destinationChain: "baseSepolia"
    },
    amount: "1000000", // 1 USDC (6 decimals)
    paymentId: "payment-001"
  },
  {
    name: "User2 → User1: CCIP-BnM (Arbitrum → Ethereum)",
    payer: {
      privateKey: process.env.USER2_PRIVATE_KEY,
      address: process.env.USER2_ADDRESS,
      sourceChain: "arbitrumSepolia",
      token: "CCIP_BNM"
    },
    recipient: {
      address: process.env.USER1_ADDRESS,
      destinationChain: "ethereumSepolia"
    },
    amount: "1000000000000000000", // 1 CCIP-BnM (18 decimals)
    paymentId: "payment-002"
  },
  {
    name: "User3 → User2: USDC (Base → Arbitrum)",
    payer: {
      privateKey: process.env.USER3_PRIVATE_KEY,
      address: process.env.USER3_ADDRESS,
      sourceChain: "baseSepolia",
      token: "USDC"
    },
    recipient: {
      address: process.env.USER2_ADDRESS,
      destinationChain: "arbitrumSepolia"
    },
    amount: "1000000", // 1 USDC (6 decimals)
    paymentId: "payment-003"
  }
];

// Get network configuration
function getNetworkConfig(networkName) {
  const configs = {
    ethereumSepolia: {
      rpc: process.env.ETHEREUM_SEPOLIA_RPC,
      chainSelector: process.env.ETHEREUM_SEPOLIA_CHAIN_SELECTOR,
      contractAddress: process.env.ETHEREUM_SEPOLIA_CONTRACT,
      tokens: {
        USDC: process.env.ETHEREUM_SEPOLIA_USDC,
        CCIP_BNM: process.env.ETHEREUM_SEPOLIA_CCIP_BNM
      }
    },
    arbitrumSepolia: {
      rpc: process.env.ARBITRUM_SEPOLIA_RPC,
      chainSelector: process.env.ARBITRUM_SEPOLIA_CHAIN_SELECTOR,
      contractAddress: process.env.ARBITRUM_SEPOLIA_CONTRACT,
      tokens: {
        USDC: process.env.ARBITRUM_SEPOLIA_USDC,
        CCIP_BNM: process.env.ARBITRUM_SEPOLIA_CCIP_BNM
      }
    },
    baseSepolia: {
      rpc: process.env.BASE_SEPOLIA_RPC,
      chainSelector: process.env.BASE_SEPOLIA_CHAIN_SELECTOR,
      contractAddress: process.env.BASE_SEPOLIA_CONTRACT,
      tokens: {
        USDC: process.env.BASE_SEPOLIA_USDC,
        CCIP_BNM: process.env.BASE_SEPOLIA_CCIP_BNM
      }
    }
  };
  
  return configs[networkName];
}

// Get contract instance for a network
async function getContractInstance(networkName, signerPrivateKey) {
  const config = getNetworkConfig(networkName);
  
  // Create provider and signer
  const provider = new hre.ethers.JsonRpcProvider(config.rpc);
  const signer = new hre.ethers.Wallet(signerPrivateKey, provider);
  
  // Get contract instance
  const contractFactory = await hre.ethers.getContractFactory("CrossChainPaymentSplitterPTT");
  const contract = contractFactory.attach(config.contractAddress).connect(signer);
  
  return { contract, provider, signer, config };
}

// Get token contract instance
async function getTokenContract(tokenAddress, provider, signer) {
  const tokenABI = [
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address, address) view returns (uint256)",
    "function approve(address, uint256) returns (bool)",
    "function transfer(address, uint256) returns (bool)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)"
  ];
  
  return new hre.ethers.Contract(tokenAddress, tokenABI, signer);
}

// Check balances before test
async function checkBalances(scenario) {
  console.log(`\n💰 Checking balances for: ${scenario.name}`);
  
  const sourceConfig = getNetworkConfig(scenario.payer.sourceChain);
  const destConfig = getNetworkConfig(scenario.recipient.destinationChain);
  
  // Check payer's source token balance
  const sourceProvider = new hre.ethers.JsonRpcProvider(sourceConfig.rpc);
  const payerSigner = new hre.ethers.Wallet(scenario.payer.privateKey, sourceProvider);
  const sourceToken = await getTokenContract(
    sourceConfig.tokens[scenario.payer.token], 
    sourceProvider, 
    payerSigner
  );
  
  const payerBalance = await sourceToken.balanceOf(scenario.payer.address);
  const tokenSymbol = await sourceToken.symbol();
  
  console.log(`- Payer (${scenario.payer.address}): ${hre.ethers.formatUnits(payerBalance, scenario.payer.token === 'USDC' ? 6 : 18)} ${tokenSymbol}`);
  
  // Check recipient's USDC balance on destination
  const destProvider = new hre.ethers.JsonRpcProvider(destConfig.rpc);
  const usdcToken = await getTokenContract(
    destConfig.tokens.USDC,
    destProvider,
    new hre.ethers.Wallet(scenario.payer.privateKey, destProvider) // Any signer for view function
  );
  
  const recipientBalance = await usdcToken.balanceOf(scenario.recipient.address);
  console.log(`- Recipient (${scenario.recipient.address}): ${hre.ethers.formatUnits(recipientBalance, 6)} USDC`);
  
  return {
    payerBalance: payerBalance.toString(),
    recipientBalance: recipientBalance.toString(),
    hasEnoughBalance: payerBalance >= BigInt(scenario.amount)
  };
}

// Execute a cross-chain payment
async function executePayment(scenario) {
  console.log(`\n🚀 Executing: ${scenario.name}`);
  console.log(`💸 Amount: ${hre.ethers.formatUnits(scenario.amount, scenario.payer.token === 'USDC' ? 6 : 18)} ${scenario.payer.token}`);
  
  try {
    // Get contract and token instances
    const { contract, provider, signer, config } = await getContractInstance(
      scenario.payer.sourceChain, 
      scenario.payer.privateKey
    );
    
    const tokenAddress = config.tokens[scenario.payer.token];
    const tokenContract = await getTokenContract(tokenAddress, provider, signer);
    
    // Check and approve token spending
    console.log(`📋 Approving token spending...`);
    const allowance = await tokenContract.allowance(scenario.payer.address, config.contractAddress);
    
    if (allowance < BigInt(scenario.amount)) {
      const approveTx = await tokenContract.approve(config.contractAddress, scenario.amount);
      await approveTx.wait();
      console.log(`✅ Token approval confirmed: ${approveTx.hash}`);
    }
    
    // Get destination chain selector
    const destConfig = getNetworkConfig(scenario.recipient.destinationChain);
    const destinationChainSelector = destConfig.chainSelector;
    
    // Estimate fees (send 0.01 ETH for fees)
    const feeAmount = hre.ethers.parseEther("0.00005");
    
    console.log(`🌉 Sending cross-chain payment...`);
    console.log(`- From: ${scenario.payer.sourceChain} (${scenario.payer.address})`);
    console.log(`- To: ${scenario.recipient.destinationChain} (${scenario.recipient.address})`);
    console.log(`- Token: ${scenario.payer.token} → USDC`);
    
    // Execute payment
    const tokenType = scenario.payer.token === 'USDC' ? 0 : 1; // TokenType enum
    
    const tx = await contract.payRecipient(
      scenario.recipient.address,
      destinationChainSelector,
      tokenAddress,
      scenario.amount,
      tokenType,
      scenario.paymentId,
      { value: feeAmount }
    );
    
    const receipt = await tx.wait();
    console.log(`✅ Payment sent! TX: ${tx.hash}`);
    
    // Extract message ID from events
    const events = receipt.logs.filter(log => {
      try {
        const decoded = contract.interface.parseLog(log);
        return decoded.name === 'DirectPaymentSent';
      } catch {
        return false;
      }
    });
    
    if (events.length > 0) {
      const decoded = contract.interface.parseLog(events[0]);
      console.log(`📩 CCIP Message ID: ${decoded.args.messageId}`);
    }
    
    return {
      success: true,
      txHash: tx.hash,
      messageId: events.length > 0 ? contract.interface.parseLog(events[0]).args.messageId : null,
      gasUsed: receipt.gasUsed.toString()
    };
    
  } catch (error) {
    console.error(`❌ Payment failed:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Wait for cross-chain message delivery
async function waitForDelivery(scenario, messageId, maxWaitTime = 10 * 60 * 1000) {
  if (!messageId) {
    console.log(`⚠️  No message ID to track delivery`);
    return false;
  }
  
  console.log(`⏳ Waiting for cross-chain delivery... (max ${maxWaitTime/1000}s)`);
  
  const destConfig = getNetworkConfig(scenario.recipient.destinationChain);
  const destProvider = new hre.ethers.JsonRpcProvider(destConfig.rpc);
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      // Check for DirectPaymentReceived event on destination chain
      const contractFactory = await hre.ethers.getContractFactory("CrossChainPaymentSplitterPTT");
      const destContract = contractFactory.attach(destConfig.contractAddress).connect(destProvider);
      
      // Query recent events
      const filter = destContract.filters.DirectPaymentReceived(
        scenario.payer.address,
        scenario.recipient.address
      );
      
      const events = await destContract.queryFilter(filter, -100); // Last 100 blocks
      
      const matchingEvent = events.find(event => 
        event.args.paymentId === scenario.paymentId
      );
      
      if (matchingEvent) {
        console.log(`✅ Payment delivered! Block: ${matchingEvent.blockNumber}`);
        console.log(`💰 Amount: ${hre.ethers.formatUnits(matchingEvent.args.amount, 6)} USDC`);
        return true;
      }
      
      // Wait 10 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 10000));
      process.stdout.write('.');
      
    } catch (error) {
      console.error(`Error checking delivery:`, error.message);
      break;
    }
  }
  
  console.log(`\n⏰ Timeout waiting for delivery`);
  return false;
}

// Run all test scenarios
async function runAllTests() {
  console.log(`🧪 CROSS-CHAIN PAYMENT TESTING`);
  console.log(`===============================`);
  console.log(`Testing ${TEST_SCENARIOS.length} scenarios...\n`);
  
  const results = [];
  
  for (let i = 0; i < TEST_SCENARIOS.length; i++) {
    const scenario = TEST_SCENARIOS[i];
    
    console.log(`\n📝 Test ${i + 1}/${TEST_SCENARIOS.length}: ${scenario.name}`);
    console.log(`${'='.repeat(50)}`);
    
    // Check balances
    const balances = await checkBalances(scenario);
    
    if (!balances.hasEnoughBalance) {
      console.log(`❌ Insufficient balance! Skipping...`);
      results.push({
        scenario: scenario.name,
        success: false,
        error: "Insufficient balance"
      });
      continue;
    }
    
    // Execute payment
    const paymentResult = await executePayment(scenario);
    
    if (!paymentResult.success) {
      results.push({
        scenario: scenario.name,
        success: false,
        error: paymentResult.error
      });
      continue;
    }
    
    // Wait for delivery
    const delivered = await waitForDelivery(scenario, paymentResult.messageId);
    
    results.push({
      scenario: scenario.name,
      success: paymentResult.success && delivered,
      txHash: paymentResult.txHash,
      messageId: paymentResult.messageId,
      delivered: delivered,
      gasUsed: paymentResult.gasUsed
    });
    
    // Check balances after
    await checkBalances(scenario);
  }
  
  // Print summary
  console.log(`\n📊 TEST SUMMARY`);
  console.log(`===============`);
  
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  
  console.log(`✅ Successful: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  
  results.forEach((result, i) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${i + 1}. ${result.scenario}`);
    if (result.txHash) console.log(`   TX: ${result.txHash}`);
    if (result.error) console.log(`   Error: ${result.error}`);
  });
  
  return results;
}

if (require.main === module) {
  runAllTests()
    .then((results) => {
      const allPassed = results.every(r => r.success);
      process.exit(allPassed ? 0 : 1);
    })
    .catch((error) => {
      console.error(`❌ Test suite failed:`, error);
      process.exit(1);
    });
}

module.exports = { runAllTests, TEST_SCENARIOS };