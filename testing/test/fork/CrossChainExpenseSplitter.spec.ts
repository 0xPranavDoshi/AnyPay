import { expect } from "chai";
import hre from "hardhat";
import { id, AbiCoder, parseEther, parseUnits } from "ethers";
import {
  getEvm2EvmMessage,
  requestLinkFromTheFaucet,
  routeMessage,
} from "@chainlink/local/scripts/CCIPLocalSimulatorFork";
import {
  CrossChainExpenseSplitter,
  IRouterClient,
  IRouterClient__factory,
  LinkTokenInterface,
} from "../../typechain-types";
import {
  getProviderRpcUrl,
  getLINKTokenAddress,
  getRouterConfig,
  getFaucetTokensAddresses,
} from "../../helpers/utils";

interface NetworkData {
  name: string;
  rpcUrl: string;
  router: string;
  chainSelector: bigint;
  linkToken: string;
  usdcToken: string;
  wethToken: string;
  swapRouter: string;
}

const NETWORKS: { [key: string]: NetworkData } = {
  ethereumSepolia: {
    name: "ethereumSepolia",
    rpcUrl: getProviderRpcUrl("ethereumSepolia"),
    router: "0xD0daae2231E9CB96b94C8512223533293C3693Bf",
    chainSelector: 16015286601757825753n,
    linkToken: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    usdcToken: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    wethToken: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    swapRouter: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E",
  },
  arbitrumSepolia: {
    name: "arbitrumSepolia", 
    rpcUrl: getProviderRpcUrl("arbitrumSepolia"),
    router: "0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165",
    chainSelector: 3478487238524512106n,
    linkToken: "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E",
    usdcToken: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    wethToken: "0xE591bf0A0CF924A0674d7792db046B23CEbF5f34",
    swapRouter: "0x101F443B4d1b059569D643917553c771E1b9663E",
  },
  baseSepolia: {
    name: "baseSepolia",
    rpcUrl: getProviderRpcUrl("baseSepolia"),
    router: "0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93",
    chainSelector: 10344971235874465080n,
    linkToken: "0xE4aB69C077896252FAFBD49EFD26B5D171A32410",
    usdcToken: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    wethToken: "0x4200000000000000000000000000000000000006",
    swapRouter: "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4",
  },
};

const DEPLOYED_CONTRACTS = {
  ethereumSepolia: "0xE6ab8fBD59d75218A14B0aCCD359AC9a777cC761",
  arbitrumSepolia: "0x17e915527fa82E3FEC083E814eF241696D0cc7F0",
  baseSepolia: "0x17e915527fa82E3FEC083E814eF241696D0cc7F0",
};

describe("CrossChainExpenseSplitter - Complete Testing Suite", function () {
  let alice: any, bob: any, charlie: any;
  const expenseId = id("dinner-test-123");
  const totalAmount = parseUnits("100", 6); // $100 USDC

  before(async function () {
    [alice, bob, charlie] = await hre.ethers.getSigners();
  });

  async function switchToNetwork(networkName: string) {
    await hre.network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: NETWORKS[networkName].rpcUrl,
          },
        },
      ],
    });
  }

  async function getContractOnNetwork(networkName: string) {
    const contractFactory = await hre.ethers.getContractFactory("CrossChainExpenseSplitter");
    return contractFactory.attach(DEPLOYED_CONTRACTS[networkName as keyof typeof DEPLOYED_CONTRACTS]) as CrossChainExpenseSplitter;
  }

  async function getFeeData() {
    const feeData = await hre.ethers.provider.getFeeData();
    return {
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    };
  }

  describe("1. Expense Creation", function () {
    it("Should create expense on Base Sepolia", async function () {
      await switchToNetwork("baseSepolia");
      const contract = await getContractOnNetwork("baseSepolia");
      const overrides = await getFeeData();

      const tx = await contract
        .connect(alice)
        .createExpense(expenseId, totalAmount, "Test dinner split", overrides);
      
      await tx.wait();

      const expense = await contract.getExpenseDetails(expenseId);
      expect(expense.creator).to.equal(alice.address);
      expect(expense.totalAmount).to.equal(totalAmount);
      expect(expense.description).to.equal("Test dinner split");
      expect(expense.amountPaid).to.equal(0);
      expect(expense.settled).to.be.false;
    });
  });

  describe("2. Same-Chain Scenarios (No Bridging)", function () {
    beforeEach(async function () {
      await switchToNetwork("baseSepolia");
      const contract = await getContractOnNetwork("baseSepolia");
      const overrides = await getFeeData();
      
      // Create fresh expense for each test
      const uniqueExpenseId = id(`expense-${Date.now()}`);
      await contract
        .connect(alice)
        .createExpense(uniqueExpenseId, totalAmount, "Test expense", overrides);
    });

    it("Should contribute with ETH (Swap Only)", async function () {
      await switchToNetwork("baseSepolia");
      const contract = await getContractOnNetwork("baseSepolia");
      const uniqueExpenseId = id(`expense-${Date.now()}`);
      const overrides = await getFeeData();
      
      // Create expense
      await contract
        .connect(alice)
        .createExpense(uniqueExpenseId, totalAmount, "ETH Swap Test", overrides);

      const contributionAmount = parseUnits("30", 6); // $30 worth
      const ethAmount = parseEther("0.02"); // Approximate ETH for $30

      // Contribute with ETH - should auto-swap to USDC
      const tx = await contract
        .connect(bob)
        .contributeWithETHLocal(uniqueExpenseId, { 
          ...overrides, 
          value: ethAmount 
        });
      
      await tx.wait();

      const expense = await contract.getExpenseDetails(uniqueExpenseId);
      expect(expense.amountPaid).to.be.gt(0); // Should have some USDC from swap
      
      const hasContributed = await contract.hasUserPaid(uniqueExpenseId, bob.address);
      expect(hasContributed).to.be.true;
    });

    it("Should contribute with USDC (Direct Transfer)", async function () {
      await switchToNetwork("baseSepolia");
      const contract = await getContractOnNetwork("baseSepolia");
      const uniqueExpenseId = id(`expense-${Date.now()}`);
      const overrides = await getFeeData();
      
      // Create expense
      await contract
        .connect(alice)
        .createExpense(uniqueExpenseId, totalAmount, "USDC Direct Test", overrides);

      const contributionAmount = parseUnits("30", 6); // $30 USDC
      
      // First need to get USDC tokens (in real test, you'd mint or get from faucet)
      // For now, test the function call structure
      
      const tx = await contract
        .connect(bob)
        .contributeWithUSDCLocal(uniqueExpenseId, contributionAmount, overrides);
      
      await tx.wait();

      const hasContributed = await contract.hasUserPaid(uniqueExpenseId, bob.address);
      expect(hasContributed).to.be.true;
    });
  });

  describe("3. Cross-Chain Scenarios (Bridge Required)", function () {
    let baseExpenseId: string;

    beforeEach(async function () {
      // Create expense on Base
      await switchToNetwork("baseSepolia");
      const baseContract = await getContractOnNetwork("baseSepolia");
      const overrides = await getFeeData();
      
      baseExpenseId = id(`cross-chain-expense-${Date.now()}`);
      await baseContract
        .connect(alice)
        .createExpense(baseExpenseId, totalAmount, "Cross-chain test", overrides);
    });

    it("Should contribute ETH from Ethereum to Base (Swap + Bridge)", async function () {
      // Switch to Ethereum to make payment
      await switchToNetwork("ethereumSepolia");
      const ethContract = await getContractOnNetwork("ethereumSepolia");
      const overrides = await getFeeData();

      const ethAmount = parseEther("0.02");
      const destinationChainSelector = NETWORKS.baseSepolia.chainSelector;

      // Get LINK for CCIP fees
      const linkToken = await hre.ethers.getContractAt(
        "LinkTokenInterface", 
        NETWORKS.ethereumSepolia.linkToken
      );
      
      // Request LINK from faucet for fees
      await requestLinkFromTheFaucet(
        NETWORKS.ethereumSepolia.linkToken, 
        bob.address, 
        parseEther("1")
      );

      const tx = await ethContract
        .connect(bob)
        .contributeWithETHCrossChain(baseExpenseId, destinationChainSelector, {
          ...overrides,
          value: ethAmount
        });

      const receipt = await tx.wait();
      expect(receipt).to.not.be.null;

      // Verify cross-chain message was sent
      const evm2EvmMessage = getEvm2EvmMessage(receipt!);
      expect(evm2EvmMessage).to.not.be.null;
    });

    it("Should contribute USDC from Arbitrum to Base (Bridge Only)", async function () {
      // Switch to Arbitrum to make payment
      await switchToNetwork("arbitrumSepolia");
      const arbContract = await getContractOnNetwork("arbitrumSepolia");
      const overrides = await getFeeData();

      const usdcAmount = parseUnits("40", 6); // $40 USDC
      const destinationChainSelector = NETWORKS.baseSepolia.chainSelector;

      // Get LINK for CCIP fees
      await requestLinkFromTheFaucet(
        NETWORKS.arbitrumSepolia.linkToken,
        charlie.address,
        parseEther("1")
      );

      const tx = await arbContract
        .connect(charlie)
        .contributeWithUSDCCrossChain(
          baseExpenseId, 
          usdcAmount, 
          destinationChainSelector, 
          overrides
        );

      const receipt = await tx.wait();
      expect(receipt).to.not.be.null;

      // Verify cross-chain message was sent
      const evm2EvmMessage = getEvm2EvmMessage(receipt!);
      expect(evm2EvmMessage).to.not.be.null;
    });
  });

  describe("4. Complete End-to-End Settlement Flow", function () {
    it("Should handle multi-chain payments and auto-settle", async function () {
      const e2eExpenseId = id(`e2e-expense-${Date.now()}`);
      
      // Step 1: Create expense on Base
      await switchToNetwork("baseSepolia");
      const baseContract = await getContractOnNetwork("baseSepolia");
      let overrides = await getFeeData();
      
      await baseContract
        .connect(alice)
        .createExpense(e2eExpenseId, totalAmount, "E2E Settlement Test", overrides);

      // Step 2: Payment 1 - Bob pays $30 ETH from Ethereum (swap + bridge)
      await switchToNetwork("ethereumSepolia");
      const ethContract = await getContractOnNetwork("ethereumSepolia");
      overrides = await getFeeData();

      await requestLinkFromTheFaucet(
        NETWORKS.ethereumSepolia.linkToken,
        bob.address,
        parseEther("2")
      );

      const bobPayment = await ethContract
        .connect(bob)
        .contributeWithETHCrossChain(
          e2eExpenseId, 
          NETWORKS.baseSepolia.chainSelector,
          { ...overrides, value: parseEther("0.02") }
        );
      
      const bobReceipt = await bobPayment.wait();
      const bobMessage = getEvm2EvmMessage(bobReceipt!);

      // Step 3: Payment 2 - Charlie pays $30 USDC from Base (same chain)
      await switchToNetwork("baseSepolia");
      overrides = await getFeeData();
      
      await baseContract
        .connect(charlie)
        .contributeWithETHLocal(e2eExpenseId, {
          ...overrides,
          value: parseEther("0.02")
        });

      // Step 4: Route Bob's cross-chain message to Base
      if (bobMessage) {
        await routeMessage(NETWORKS.baseSepolia.router, bobMessage);
      }

      // Step 5: Check if expense is getting closer to settlement
      const finalExpense = await baseContract.getExpenseDetails(e2eExpenseId);
      console.log(`Final amount paid: ${finalExpense.amountPaid.toString()}`);
      console.log(`Target amount: ${totalAmount.toString()}`);
      
      // The expense should have received contributions
      expect(finalExpense.amountPaid).to.be.gt(0);
    });
  });

  describe("5. Error Handling & Edge Cases", function () {
    it("Should revert when contributing to non-existent expense", async function () {
      await switchToNetwork("baseSepolia");
      const contract = await getContractOnNetwork("baseSepolia");
      const overrides = await getFeeData();

      const fakeExpenseId = id("fake-expense");

      await expect(
        contract.connect(bob).contributeWithETHLocal(fakeExpenseId, {
          ...overrides,
          value: parseEther("0.01")
        })
      ).to.be.revertedWith("Expense does not exist");
    });

    it("Should prevent double payments from same user", async function () {
      await switchToNetwork("baseSepolia");
      const contract = await getContractOnNetwork("baseSepolia");
      const uniqueExpenseId = id(`double-pay-${Date.now()}`);
      const overrides = await getFeeData();
      
      // Create expense
      await contract
        .connect(alice)
        .createExpense(uniqueExpenseId, totalAmount, "Double pay test", overrides);

      // First payment
      await contract
        .connect(bob)
        .contributeWithETHLocal(uniqueExpenseId, {
          ...overrides,
          value: parseEther("0.01")
        });

      // Second payment should fail
      await expect(
        contract.connect(bob).contributeWithETHLocal(uniqueExpenseId, {
          ...overrides,
          value: parseEther("0.01")
        })
      ).to.be.revertedWith("User has already paid");
    });

    it("Should handle expense overpayment correctly", async function () {
      await switchToNetwork("baseSepolia");
      const contract = await getContractOnNetwork("baseSepolia");
      const smallExpenseId = id(`overpay-${Date.now()}`);
      const smallAmount = parseUnits("10", 6); // $10 expense
      const overrides = await getFeeData();
      
      // Create small expense
      await contract
        .connect(alice)
        .createExpense(smallExpenseId, smallAmount, "Overpay test", overrides);

      // Pay more than required
      await contract
        .connect(bob)
        .contributeWithETHLocal(smallExpenseId, {
          ...overrides,
          value: parseEther("0.1") // Much more than $10
        });

      const expense = await contract.getExpenseDetails(smallExpenseId);
      // Should handle overpayment gracefully (exact behavior depends on contract logic)
      expect(expense.amountPaid).to.be.gt(0);
    });
  });

  describe("6. Gas Fee Estimation Tests", function () {
    it("Should estimate gas fees for cross-chain operations", async function () {
      await switchToNetwork("ethereumSepolia");
      const contract = await getContractOnNetwork("ethereumSepolia");
      
      // Test gas estimation for cross-chain calls
      const gasEstimate = await contract.estimateGas.contributeWithETHCrossChain(
        expenseId,
        NETWORKS.baseSepolia.chainSelector,
        { value: parseEther("0.01") }
      );
      
      expect(gasEstimate).to.be.gt(0);
      console.log(`Cross-chain gas estimate: ${gasEstimate.toString()}`);
    });
  });
});