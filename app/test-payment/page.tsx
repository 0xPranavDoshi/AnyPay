"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { TokenType } from "@/lib/interface";

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Test payment from database
const testPayment = {
  _id: "68a0baf7c65fa0569b8b94f3",
  payer: {
    username: "user2",
    walletAddress: "0xef77667ffa4790a1bd2049760c116250ea65a923"
  },
  totalAmount: 1,
  owers: [{
    user: {
      username: "mug",
      walletAddress: "0xf4dbc2a568257f12e55ea718d74c13e70f6f8e3f"
    },
    amount: 1
  }],
  description: "Test payment for cross-chain functionality"
};

const CHAINS = {
  "11155111": {
    name: "Ethereum Sepolia",
    tokens: [TokenType.USDC, TokenType.CCIP_BNM, TokenType.CCIP_LNM]
  },
  "421614": {
    name: "Arbitrum Sepolia", 
    tokens: [TokenType.USDC, TokenType.CCIP_BNM, TokenType.CCIP_LNM]
  },
  "84532": {
    name: "Base Sepolia",
    tokens: [TokenType.USDC, TokenType.CCIP_BNM, TokenType.CCIP_LNM]
  }
};

const TOKEN_NAMES = {
  [TokenType.USDC]: "USDC",
  [TokenType.CCIP_BNM]: "CCIP-BnM",
  [TokenType.CCIP_LNM]: "CCIP-LnM"
};

export default function TestPayment() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [connectedAddress, setConnectedAddress] = useState("");
  const [selectedChain, setSelectedChain] = useState("");
  const [selectedToken, setSelectedToken] = useState<TokenType | "">("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const connectMetaMask = async () => {
    if (!window.ethereum) {
      alert("MetaMask not found! Please install MetaMask.");
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      
      if (accounts && accounts.length > 0) {
        setConnectedAddress(accounts[0]);
        
        // Check if connected address matches the ower
        if (accounts[0].toLowerCase() === testPayment.owers[0].user.walletAddress.toLowerCase()) {
          setShowPaymentForm(true);
          setStatus(" Connected as mug - Ready to pay!");
        } else {
          setStatus(`� Connected as ${accounts[0]} but payment is for ${testPayment.owers[0].user.walletAddress}`);
        }
      }
    } catch (error) {
      console.error("MetaMask connection error:", error);
      setStatus("L Failed to connect MetaMask");
    }
  };

  const handlePayment = async () => {
    if (!selectedChain || selectedToken === "") {
      alert("Please select source chain and token type");
      return;
    }

    setIsProcessing(true);
    setCurrentStep(1);
    setStatus("Starting payment process...");

    try {
      // Payment data
      const paymentData = {
        recipientAddress: testPayment.payer.walletAddress, // user2 receives payment
        amount: testPayment.owers[0].amount,
        sourceChain: selectedChain,
        destinationChain: "84532", // Always Base Sepolia for USDC settlement
        tokenType: selectedToken,
        userAddress: connectedAddress
      };

      // Step 1: Get transaction parameters from API
      setCurrentStep(2);
      setStatus("Getting transaction parameters...");

      const response = await fetch("/api/pay", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Cookie": `user=${encodeURIComponent(JSON.stringify({
            username: "mug",
            walletAddress: connectedAddress
          }))}`
        },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || result.details);
      }

      const { transactionParams } = result;
      setPaymentId(result.paymentId);

      console.log("Transaction params:", transactionParams);

      // Step 2: Setup MetaMask provider
      setCurrentStep(3);
      setStatus("Setting up blockchain connection...");

      // Check current network first
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(chainId, 16).toString();
      
      console.log("Current chain:", currentChainId, "Target chain:", selectedChain);
      
      // Switch network if needed
      if (currentChainId !== selectedChain) {
        setStatus(`Switching to ${CHAINS[selectedChain as keyof typeof CHAINS].name}...`);
        const chainHex = `0x${parseInt(selectedChain).toString(16)}`;
        
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: chainHex }],
          });
          
          // Wait a bit for the network to switch
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            throw new Error(`Please add ${CHAINS[selectedChain as keyof typeof CHAINS].name} to MetaMask first`);
          }
          throw switchError;
        }
      }

      // Create fresh provider after network switch
      const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
      const signer = provider.getSigner();

      // Step 3: Check token approval
      setCurrentStep(4);
      setStatus(`Checking ${TOKEN_NAMES[selectedToken as TokenType]} approval...`);

      const tokenContract = new ethers.Contract(
        transactionParams.tokenAddress,
        [
          "function allowance(address owner, address spender) view returns (uint256)",
          "function approve(address spender, uint256 amount) returns (bool)"
        ],
        signer
      );

      const allowance = await tokenContract.allowance(connectedAddress, transactionParams.contractAddress);
      const amountBigNumber = ethers.BigNumber.from(transactionParams.amountWei);

      console.log("Current allowance:", allowance.toString());
      console.log("Required amount:", amountBigNumber.toString());

      // Approve token if needed
      if (allowance.lt(amountBigNumber)) {
        setStatus(`Approving ${TOKEN_NAMES[selectedToken as TokenType]} spend...`);
        
        const approveTx = await tokenContract.approve(
          transactionParams.contractAddress, 
          transactionParams.amountWei
        );
        
        console.log("Approval tx:", approveTx.hash);
        await approveTx.wait();
        console.log("Approval confirmed");
      }

      // Step 4: Execute cross-chain payment
      setCurrentStep(5);
      setStatus("Executing cross-chain payment...");

      const contract = new ethers.Contract(
        transactionParams.contractAddress,
        [{
          "inputs": [
            {"internalType": "address", "name": "recipient", "type": "address"},
            {"internalType": "uint64", "name": "destinationChainSelector", "type": "uint64"},
            {"internalType": "address", "name": "tokenIn", "type": "address"},
            {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
            {"internalType": "enum CrossChainPaymentSplitterPTT.TokenType", "name": "fromToken", "type": "uint8"},
            {"internalType": "string", "name": "paymentId", "type": "string"}
          ],
          "name": "payRecipient",
          "outputs": [{"internalType": "bytes32", "name": "messageId", "type": "bytes32"}],
          "stateMutability": "payable",
          "type": "function"
        }],
        signer
      );

      console.log("Calling payRecipient with:", {
        recipient: transactionParams.recipientAddress,
        chainSelector: transactionParams.destinationChainSelector,
        token: transactionParams.tokenAddress,
        amount: transactionParams.amountWei,
        tokenType: transactionParams.tokenType,
        paymentId: result.paymentId
      });

      // Get proper CCIP fees using router
      console.log("Getting CCIP fees...");
      
      // Calculate fees properly - use router
      const routerABI = ["function getFee(uint64 destinationChainSelector, tuple(bytes receiver, bytes data, tuple(address token, uint256 amount)[] tokenAmounts, address feeToken, bytes extraArgs) message) view returns (uint256 fee)"];
      const routerAddress = "0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165"; // Arbitrum Sepolia router
      const routerContract = new ethers.Contract(routerAddress, routerABI, signer);
      
      // Prepare CCIP message for fee calculation
      const ccipMessage = {
        receiver: ethers.utils.defaultAbiCoder.encode(["address"], [transactionParams.contractAddress]),
        data: ethers.utils.defaultAbiCoder.encode(
          ["string", "address", "address", "uint256", "uint8", "string"],
          ["DIRECT_PAYMENT", transactionParams.recipientAddress, connectedAddress, transactionParams.amountWei, transactionParams.tokenType, result.paymentId]
        ),
        tokenAmounts: [{
          token: transactionParams.tokenAddress,
          amount: transactionParams.amountWei
        }],
        feeToken: ethers.constants.AddressZero, // Pay in ETH
        extraArgs: "0x"
      };
      
      let ccipFees;
      try {
        ccipFees = await routerContract.getFee(transactionParams.destinationChainSelector, ccipMessage);
        console.log("CCIP fees:", ethers.utils.formatEther(ccipFees), "ETH");
      } catch (feeError) {
        console.log("Fee calculation failed, using fallback:", feeError);
        ccipFees = ethers.utils.parseEther("0.02"); // Fallback
      }

      const tx = await contract.payRecipient(
        transactionParams.recipientAddress,
        transactionParams.destinationChainSelector,
        transactionParams.tokenAddress,
        transactionParams.amountWei,
        transactionParams.tokenType,
        result.paymentId,
        { 
          gasLimit: 1000000, // Increase gas limit like working test
          value: ccipFees.add(ethers.utils.parseEther("0.005")) // Add buffer to CCIP fees
        }
      );

      console.log("Transaction sent:", tx.hash);
      setTxHash(tx.hash);

      // Step 5: Submit to backend for completion
      setCurrentStep(6);
      setStatus("Finalizing payment...");

      const submitResponse = await fetch("/api/submit-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: result.paymentId,
          txHash: tx.hash,
          sourceChain: selectedChain
        })
      });

      const submitResult = await submitResponse.json();

      if (submitResult.success) {
        setCurrentStep(7);
        setStatus(" Cross-chain payment completed successfully!");
        console.log("Final result:", submitResult);
      } else {
        throw new Error(submitResult.error || submitResult.details);
      }

    } catch (error) {
      console.error("Payment error:", error);
      setStatus(`L Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">{'>'}� Cross-Chain Payment Test</h1>
        
        {/* Payment Details */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">=� Payment Details</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Payment ID:</span>
              <span className="font-mono text-sm">{testPayment._id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Description:</span>
              <span>{testPayment.description}</span>
            </div>
            <div className="border-t border-gray-700 pt-3">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Ower (You):</span>
                <div className="text-right">
                  <div className="font-semibold">{testPayment.owers[0].user.username}</div>
                  <div className="text-xs font-mono text-gray-400">{testPayment.owers[0].user.walletAddress}</div>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Payee:</span>
                <div className="text-right">
                  <div className="font-semibold">{testPayment.payer.username}</div>
                  <div className="text-xs font-mono text-gray-400">{testPayment.payer.walletAddress}</div>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center text-lg font-bold text-green-400">
              <span>Amount to Pay:</span>
              <span>${testPayment.owers[0].amount}</span>
            </div>
          </div>
        </div>

        {/* MetaMask Connection */}
        {!connectedAddress ? (
          <div className="bg-blue-900 rounded-lg p-6 mb-6 text-center">
            <h3 className="text-lg font-semibold mb-4">Connect MetaMask as Ower</h3>
            <p className="text-sm text-gray-300 mb-4">
              Connect with the wallet address: <br/>
              <code className="bg-gray-800 px-2 py-1 rounded">{testPayment.owers[0].user.walletAddress}</code>
            </p>
            <button
              onClick={connectMetaMask}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold"
            >
              {'>'} Connect MetaMask
            </button>
          </div>
        ) : (
          <div className="bg-green-900 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-2"> MetaMask Connected</h3>
            <p className="text-sm text-gray-300">
              Connected as: <code className="bg-gray-800 px-2 py-1 rounded">{connectedAddress}</code>
            </p>
            <p className="text-sm text-gray-400 mt-2">{status}</p>
          </div>
        )}

        {/* Payment Form */}
        {showPaymentForm && !isProcessing && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">= Choose Payment Method</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Source Chain (Where you have tokens)</label>
                <select
                  value={selectedChain}
                  onChange={(e) => {
                    setSelectedChain(e.target.value);
                    setSelectedToken(""); // Reset token selection
                  }}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                >
                  <option value="">Select source chain</option>
                  {Object.entries(CHAINS).map(([chainId, chain]) => (
                    <option key={chainId} value={chainId}>
                      {chain.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Token Type</label>
                <select
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value === "" ? "" : parseInt(e.target.value) as TokenType)}
                  disabled={!selectedChain}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 disabled:opacity-50"
                >
                  <option value="">Select token</option>
                  {selectedChain && CHAINS[selectedChain as keyof typeof CHAINS].tokens.map((token) => (
                    <option key={token} value={token}>
                      {TOKEN_NAMES[token]}
                    </option>
                  ))}
                </select>
              </div>

              {selectedChain && selectedToken !== "" && (
                <div className="bg-blue-900 border border-blue-700 rounded-lg p-3">
                  <div className="text-sm text-blue-200 mb-1">= Transaction Preview:</div>
                  <div className="text-sm space-y-1">
                    <div>" Send {TOKEN_NAMES[selectedToken as TokenType]} from {CHAINS[selectedChain as keyof typeof CHAINS].name}</div>
                    <div>" Auto-convert to USDC via Chainlink CCIP</div>
                    <div>" {testPayment.payer.username} receives USDC on Base Sepolia</div>
                  </div>
                </div>
              )}

              <button
                onClick={handlePayment}
                disabled={!selectedChain || selectedToken === ""}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold"
              >
                =� Pay ${testPayment.owers[0].amount} Cross-Chain
              </button>
            </div>
          </div>
        )}

        {/* Transaction Progress */}
        {isProcessing && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">� Payment in Progress</h3>
            
            <div className="space-y-3">
              {[
                "Starting payment",
                "Getting transaction parameters", 
                "Setting up blockchain connection",
                "Checking token approval",
                "Executing cross-chain payment",
                "Finalizing payment",
                "Complete"
              ].map((step, index) => (
                <div key={index} className={`flex items-center space-x-3 ${
                  currentStep > index + 1 ? 'text-green-400' : 
                  currentStep === index + 1 ? 'text-blue-400' : 
                  'text-gray-500'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    currentStep > index + 1 ? 'bg-green-400 text-black' :
                    currentStep === index + 1 ? 'bg-blue-400 text-black' :
                    'bg-gray-600'
                  }`}>
                    {currentStep > index + 1 ? '' : index + 1}
                  </div>
                  <span>{step}</span>
                </div>
              ))}
            </div>
            
            {status && (
              <div className="mt-4 p-3 bg-gray-700 rounded">
                <p className="text-sm">{status}</p>
              </div>
            )}

            {txHash && (
              <div className="mt-4 p-3 bg-purple-900 rounded">
                <p className="text-sm"><strong>Transaction Hash:</strong></p>
                <p className="text-xs font-mono break-all">{txHash}</p>
              </div>
            )}

            {paymentId && (
              <div className="mt-4 p-3 bg-blue-900 rounded">
                <p className="text-sm"><strong>Payment ID:</strong></p>
                <p className="text-xs font-mono break-all">{paymentId}</p>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-gray-400">
          <p><strong>How it works:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>You (mug) choose which token/chain to pay from</li>
            <li>MetaMask signs the cross-chain transaction</li>
            <li>Chainlink CCIP bridges and converts tokens automatically</li>
            <li>user2 receives USDC on Base Sepolia (faster settlement)</li>
            <li>Database tracks the payment completion</li>
          </ul>
        </div>
      </div>
    </div>
  );
}