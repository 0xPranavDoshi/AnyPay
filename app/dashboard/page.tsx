"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { removeCookie } from "@/utils/cookie";
import { CrossChainPayment, TokenType } from "@/lib/interface";
import PaymentModal from "@/components/PaymentModal";
import TransactionModal from "@/components/TransactionModal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SelectedUsers from "@/components/SelectedUsers";
import UserMentionDropdown from "@/components/UserMentionDropdown";
import { ethers } from "ethers";

interface User {
  username: string;
  walletAddress: string;
}

interface Payment {
  payer: User;
  totalAmount: number;
  owers: {
    user: User;
    amount: number;
  }[];
}

interface ChatMessage {
  role: "user" | "bot";
  content: string;
  image?: string;
}

// Declare ethereum for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function Dashboard() {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<"owe" | "owed" | "paid">("owe");
  const [user, setUser] = useState<User | null>(null);
  const [crossChainPayments, setCrossChainPayments] = useState<
    CrossChainPayment[]
  >([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    recipientUser?: { username: string; walletAddress: string };
    amount?: number;
    paymentId?: string;
  }>({ isOpen: false });
  const [transactionState, setTransactionState] = useState<{
    isProcessing: boolean;
    status: string;
    txHash?: string;
    step: number;
    totalSteps: number;
    sourceChain?: string;
    tokenType?: number;
  }>({ isProcessing: false, status: "", step: 0, totalSteps: 4 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to get explorer URL
  const getExplorerUrl = (
    txHash: string,
    chainId: string,
    tokenType: number,
    messageId?: string,
    sourceChain?: string,
    destinationChain?: string
  ) => {
    // Get the chain explorer URL first
    const baseUrl =
      chainId === "84532"
        ? "https://sepolia.basescan.org/tx/"
        : chainId === "421614"
        ? "https://sepolia.arbiscan.io/tx/"
        : "https://sepolia.etherscan.io/tx/";

    // For CCIP tokens going cross-chain, use CCIP explorer if we have messageId
    if (
      (tokenType === 1 || tokenType === 2) &&
      sourceChain !== destinationChain
    ) {
      if (
        messageId &&
        messageId !== "pending" &&
        messageId !== "direct-transfer"
      ) {
        return `https://ccip.chain.link/msg/${messageId}`;
      }
    }

    // For everything else (USDC transfers, same-chain CCIP, or pending CCIP), use chain explorer
    return `${baseUrl}${txHash}`;
  };
  const inputRef = useRef<HTMLInputElement>(null);

  // Payment data state
  const [youOwe, setYouOwe] = useState<any[]>([]);
  const [owedToYou, setOwedToYou] = useState<any[]>([]);
  const [paidPayments, setPaidPayments] = useState<any[]>([]);

  // Mention system state
  const [usersSelected, setUsersSelected] = useState<User[]>([]);
  const [mentionDropdown, setMentionDropdown] = useState<{
    isOpen: boolean;
    searchTerm: string;
    position: { x: number; y: number };
  }>({ isOpen: false, searchTerm: "", position: { x: 0, y: 0 } });

  // Get user from cookies and fetch payments on component mount
  useEffect(() => {
    const getUserData = () => {
      // Client-side cookie parsing
      const cookies = document.cookie.split(";");
      const userCookie = cookies.find((cookie) =>
        cookie.trim().startsWith("user=")
      );
      if (userCookie) {
        try {
          const userData = JSON.parse(
            decodeURIComponent(userCookie.split("=")[1])
          );
          setUser(userData);
          fetchUserPayments(userData.walletAddress);
        } catch (error) {
          console.error("Error parsing user cookie:", error);
        }
      }
    };
    getUserData();
  }, []);

  // Fetch real payments for user from database
  const fetchUserPayments = async (userAddress: string) => {
    try {
      setPaymentsLoading(true);
      const response = await fetch(`/api/payments?userAddress=${userAddress}`);
      if (response.ok) {
        const data = await response.json();
        setYouOwe(data.youOwe || []);
        setOwedToYou(data.owedToYou || []);
        setPaidPayments(data.paidPayments || []);
        setCrossChainPayments(data.crossChainPayments || []);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setPaymentsLoading(false);
    }
  };

  // Handle user logout
  const handleLogout = () => {
    // Remove user cookie
    removeCookie("user");

    // Clear user state
    setUser(null);
    setCrossChainPayments([]);
    setYouOwe([]);
    setOwedToYou([]);
    setPaidPayments([]);
    setUsersSelected([]);

    // Redirect to home page
    window.location.href = "/";
  };

  // Chain configurations (matching deployed contracts from testing/.env)
  const CHAINS = {
    "11155111": {
      name: "Ethereum Sepolia",
      tokens: [TokenType.USDC, TokenType.CCIP_BNM, TokenType.CCIP_LNM],
      explorerUrl: "https://sepolia.etherscan.io/tx/",
      routerAddress: "0xD0daae2231E9CB96b94C8512223533293C3693Bf", // Fixed router address
    },
    "421614": {
      name: "Arbitrum Sepolia",
      tokens: [TokenType.USDC, TokenType.CCIP_BNM, TokenType.CCIP_LNM],
      explorerUrl: "https://sepolia.arbiscan.io/tx/",
      routerAddress: "0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165",
    },
    "84532": {
      name: "Base Sepolia",
      tokens: [TokenType.USDC, TokenType.CCIP_BNM, TokenType.CCIP_LNM],
      explorerUrl: "https://sepolia.basescan.org/tx/",
      routerAddress: "0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93",
    },
  };

  const TOKEN_NAMES = {
    [TokenType.USDC]: "USDC",
    [TokenType.CCIP_BNM]: "CCIP-BnM",
    [TokenType.CCIP_LNM]: "CCIP-LnM",
  };

  const handlePayUser = (
    targetUser: User,
    amount: number,
    paymentId: string
  ) => {
    setPaymentModal({
      isOpen: true,
      recipientUser: targetUser,
      amount,
    });
  };

  const handlePaymentConfirm = async (paymentData: {
    sourceChain: string;
    destinationChain: string;
    tokenType: TokenType;
  }) => {
    if (!paymentModal.recipientUser || !paymentModal.amount || !user) return;

    try {
      // Start transaction process
      setTransactionState({
        isProcessing: true,
        status: "🔄 Connecting to MetaMask...",
        step: 1,
        totalSteps: 4,
      });

      // Connect to MetaMask
      if (!window.ethereum) {
        throw new Error("MetaMask not installed");
      }

      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();

      // Step 1: Get transaction parameters from API
      setTransactionState((prev) => ({
        ...prev,
        status: "📋 Preparing transaction...",
        step: 2,
      }));

      const payResponse = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientAddress: paymentModal.recipientUser.walletAddress,
          amount: paymentModal.amount,
          sourceChain: paymentData.sourceChain,
          destinationChain: paymentData.destinationChain,
          tokenType: paymentData.tokenType,
          userAddress: userAddress,
        }),
      });

      const payResult = await payResponse.json();
      if (!payResult.success) {
        throw new Error(payResult.error || "Failed to prepare transaction");
      }

      const { transactionParams, paymentId } = payResult;

      // Step 2: Check/Approve token if needed
      setTransactionState((prev) => ({
        ...prev,
        status: "✅ Checking token approval...",
        step: 3,
      }));

      const tokenContract = new ethers.Contract(
        transactionParams.tokenAddress,
        [
          "function allowance(address,address) view returns (uint256)",
          "function approve(address,uint256) returns (bool)",
        ],
        signer
      );

      const allowance = await tokenContract.allowance(
        userAddress,
        transactionParams.contractAddress
      );
      const amountWei = ethers.BigNumber.from(transactionParams.amountWei);

      if (allowance.lt(amountWei)) {
        const approveTx = await tokenContract.approve(
          transactionParams.contractAddress,
          amountWei
        );
        await approveTx.wait();
      }

      // Step 3: Execute payment (cross-chain or direct transfer)
      // Use the isSameChain flag from API response for consistency
      // Only USDC same-chain transfers should be treated as direct transfers
      const isSameChain =
        transactionParams.isSameChain && paymentData.tokenType === 0;

      let tx;

      if (isSameChain) {
        // Same-chain USDC transfer - use direct ERC20 transfer
        setTransactionState((prev) => ({
          ...prev,
          status: "💸 Executing direct USDC transfer...",
          step: 4,
        }));

        const usdcContract = new ethers.Contract(
          transactionParams.tokenAddress,
          ["function transfer(address to, uint256 amount) returns (bool)"],
          signer
        );

        tx = await usdcContract.transfer(
          transactionParams.recipientAddress,
          transactionParams.amountWei,
          {
            gasLimit: 100000, // Much lower gas for simple transfer
          }
        );

        console.log("Direct USDC transfer sent:", tx.hash);
      } else {
        // Cross-chain payment - use CCIP contract
        setTransactionState((prev) => ({
          ...prev,
          status: "🚀 Executing cross-chain payment...",
          step: 4,
        }));

        const paymentContract = new ethers.Contract(
          transactionParams.contractAddress,
          [
            "function payRecipient(address,uint64,address,uint256,uint8,string) payable returns (bytes32)",
          ],
          signer
        );

        // Calculate CCIP fees
        let ccipFees;
        try {
          ccipFees = await paymentContract.callStatic.payRecipient(
            transactionParams.recipientAddress,
            transactionParams.destinationChainSelector,
            transactionParams.tokenAddress,
            transactionParams.amountWei,
            transactionParams.tokenType,
            paymentId
          );
        } catch (error) {
          console.log("Fee estimation failed, using fallback:", error);
          ccipFees = ethers.utils.parseEther("0.003"); // Much lower fallback fee for testing
        }

        tx = await paymentContract.payRecipient(
          transactionParams.recipientAddress,
          transactionParams.destinationChainSelector,
          transactionParams.tokenAddress,
          transactionParams.amountWei,
          transactionParams.tokenType,
          paymentId,
          {
            gasLimit: 500000, // Reduced gas limit
            value: ccipFees.add(ethers.utils.parseEther("0.001")), // Much smaller buffer - total ~0.004 ETH
          }
        );

        console.log("Cross-chain transaction sent:", tx.hash);
      }

      console.log("Transaction sent:", tx.hash);

      if (isSameChain) {
        // For same-chain USDC transfers, show transaction immediately
        const explorerUrl = getExplorerUrl(
          tx.hash,
          paymentData.sourceChain,
          paymentData.tokenType
        );

        setTransactionState({
          isProcessing: false,
          status: "✅ USDC Transfer Sent!",
          step: 4,
          totalSteps: 4,
          txHash: tx.hash,
          sourceChain: paymentData.sourceChain,
          tokenType: paymentData.tokenType,
        });

        // Record the payment for same-chain transfers and refresh
        fetch("/api/record-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentId,
            txHash: tx.hash,
            sourceChain: paymentData.sourceChain,
            recipientAddress: transactionParams.recipientAddress,
            amount: paymentModal.amount,
            tokenType: paymentData.tokenType,
            payer: user,
          }),
        })
          .then(() => {
            // Refresh payments immediately to show in paid section
            if (user) {
              fetchUserPayments(user.walletAddress);
            }
          })
          .catch((error) => {
            console.log("Background payment recording failed:", error);
          });

        // Close modal
        setTimeout(() => {
          setPaymentModal({ isOpen: false });
        }, 1000);
      } else {
        // For cross-chain payments, show transaction immediately and submit to API
        const explorerUrl = getExplorerUrl(
          tx.hash,
          paymentData.sourceChain,
          paymentData.tokenType
        );

        setTransactionState({
          isProcessing: false,
          status: "✅ Cross-chain Payment Sent!",
          step: 4,
          totalSteps: 4,
          txHash: tx.hash,
          sourceChain: paymentData.sourceChain,
          tokenType: paymentData.tokenType,
        });

        // Submit to API and refresh payments
        fetch("/api/submit-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentId,
            txHash: tx.hash,
            sourceChain: paymentData.sourceChain,
            destinationChain: paymentData.destinationChain,
            tokenType: paymentData.tokenType,
            // Add payment details for record creation
            payer: user,
            recipientAddress: transactionParams.recipientAddress,
            amount: paymentModal.amount,
          }),
        })
          .then(() => {
            // Refresh payments immediately to show in paid section
            if (user) {
              fetchUserPayments(user.walletAddress);
            }
          })
          .catch((error) => {
            console.log("Background API call failed:", error);
          });

        // Close modal
        setTimeout(() => {
          setPaymentModal({ isOpen: false });
        }, 2000);
      }
    } catch (error) {
      console.error("Payment error:", error);
      setTransactionState({
        isProcessing: false,
        status: `❌ Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        step: 0,
        totalSteps: 4,
      });
      setTimeout(() => {
        setTransactionState({
          isProcessing: false,
          status: "",
          step: 0,
          totalSteps: 4,
        });
      }, 5000);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImage(reader.result);
        if (e.target) e.target.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImage(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Mention system functions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const previousInput = input;
    setInput(value);

    // Check for @ symbol to open mention dropdown
    const atIndex = value.lastIndexOf("@");
    if (atIndex !== -1) {
      const searchTerm = value.slice(atIndex + 1);

      // Check if the search term contains a space (user finished typing username)
      if (searchTerm.includes(" ")) {
        setMentionDropdown((prev) => ({ ...prev, isOpen: false }));
        return;
      }

      // Open dropdown immediately when @ is typed
      setMentionDropdown({
        isOpen: true,
        searchTerm,
        position: {
          x: 0, // Relative to the input container
          y: 0, // Will be positioned above the input
        },
      });
    } else {
      setMentionDropdown((prev) => ({ ...prev, isOpen: false }));
    }

    // Check if any mentioned users were removed from the input
    checkForRemovedMentions(previousInput, value);
  };

  // Function to check if mentioned users were removed from input
  const checkForRemovedMentions = (
    previousInput: string,
    currentInput: string
  ) => {
    // Extract all @username patterns from previous and current input
    // Using a more robust regex that captures @username followed by space or end of string
    const previousMentions = (previousInput.match(/@(\w+)(?=\s|$)/g) ||
      []) as string[];
    const currentMentions = (currentInput.match(/@(\w+)(?=\s|$)/g) ||
      []) as string[];

    // Find mentions that were removed
    const removedMentions = previousMentions.filter(
      (mention) => !currentMentions.includes(mention)
    );

    // Remove users from usersSelected if their mention was deleted
    removedMentions.forEach((removedMention) => {
      const username = removedMention.substring(1); // Remove @ symbol
      const userToRemove = usersSelected.find(
        (user) => user.username === username
      );

      if (userToRemove) {
        console.log(
          `Removing ${username} from selected users as mention was deleted`
        );
        setUsersSelected((prev) =>
          prev.filter((user) => user.username !== username)
        );
      }
    });
  };

  const handleSelectUser = (selectedUser: User) => {
    console.log("selectedUser is", selectedUser);
    // Check if user is already selected
    if (
      !usersSelected.find(
        (user) => user.walletAddress === selectedUser.walletAddress
      )
    ) {
      setUsersSelected((prev) => [...prev, selectedUser]);
    }

    // Replace @searchTerm with @username in input
    const atIndex = input.lastIndexOf("@");
    if (atIndex !== -1) {
      const beforeAt = input.slice(0, atIndex);
      const afterSearchTerm = input.slice(
        atIndex + mentionDropdown.searchTerm.length + 1
      );
      // Add the username with a space after it
      console.log(
        "new input is",
        beforeAt + "@" + selectedUser.username + " " + afterSearchTerm
      );
      setInput(beforeAt + "@" + selectedUser.username + " " + afterSearchTerm);
    }

    // Close dropdown
    setMentionDropdown((prev) => ({ ...prev, isOpen: false }));
  };

  const handleRemoveUser = (userToRemove: User) => {
    setUsersSelected((prev) =>
      prev.filter((user) => user.walletAddress !== userToRemove.walletAddress)
    );
  };

  const closeMentionDropdown = () => {
    setMentionDropdown((prev) => ({ ...prev, isOpen: false }));
  };

  // Handle keydown events for better UX
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      closeMentionDropdown();
    }
  };

  const handleSendMessage = async () => {
    if ((!input.trim() && !image) || isLoading) return;

    const messageContent = input.trim();
    const messageImage = image;
    const isFirstClientMessage = chatHistory.length === 0;

    // Add user message to chat immediately
    const userMessage: ChatMessage = {
      role: "user",
      content: messageContent,
      image: messageImage,
    };
    setChatHistory((prev) => [...prev, userMessage]);

    // Clear the input fields and image
    setInput("");
    setImage(undefined);
    setIsLoading(true);

    try {
      // Send message to agent API with streaming
      console.log("Metioned users are", usersSelected);
      console.log("user is", user);
      const payload: any = {
        prompt: messageContent,
        image: messageImage,
        stream: true,
        users: usersSelected,
        userData: user,
      };
      // Refresh session on page load (first message after refresh)
      if (isFirstClientMessage) {
        payload.refresh_session = true;
      } else {
        payload.refresh_session = false;
        if (sessionId) payload.sessionID = sessionId;
      }

      // Get CDP account from server-side API to avoid browser compatibility issues
      const cdpResponse: any = await fetch("/api/cdp-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "AnyPayServerWallet", payload }),
      });

      if (cdpResponse.status === 500) {
        alert(cdpResponse.error || "Failed to process request. Try again.");
        return;
      }
      console.log("response:", cdpResponse.body);

      // Handle streaming response
      const reader = cdpResponse.body?.getReader();
      const decoder = new TextDecoder();
      let streamingContent = "";

      if (reader) {
        // Add initial bot message for streaming
        setChatHistory((prev) => [
          ...prev,
          {
            role: "bot",
            content: "",
          },
        ]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                setIsLoading(false);
                return;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.type === "content") {
                  streamingContent = parsed.content;
                  // Update the last message (bot message) with streaming content
                  setChatHistory((prev) => {
                    const updated = [...prev];
                    if (updated[updated.length - 1]?.role === "bot") {
                      updated[updated.length - 1].content = streamingContent;
                    }
                    return updated;
                  });
                } else if (parsed.type === "metadata") {
                  // Handle bill splitting metadata if needed
                  console.log("Bill splitting state:", parsed.billSplitting);
                  // Capture and persist server-provided sessionId for follow-ups
                  if (parsed.sessionId) {
                    setSessionId(parsed.sessionId);
                  }
                }
              } catch (e) {
                console.error("Error parsing streaming data:", e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setChatHistory((prev) => [
        ...prev,
        {
          role: "bot",
          content:
            "Sorry, I encountered an error processing your message. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      {/* Enhanced Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Primary floating orbs */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-[var(--color-primary)]/8 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-[var(--color-primary)]/6 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-32 left-1/3 w-28 h-28 bg-gradient-to-br from-[var(--color-primary)]/7 to-transparent rounded-full blur-3xl animate-pulse delay-2000"></div>
        <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-gradient-to-br from-[var(--color-primary)]/5 to-transparent rounded-full blur-3xl animate-pulse delay-1500"></div>

        {/* Secondary accent orbs */}
        <div className="absolute top-16 left-1/4 w-16 h-16 bg-gradient-to-br from-[#0ea5e9]/6 to-transparent rounded-full blur-2xl animate-pulse delay-500"></div>
        <div className="absolute top-2/3 right-1/3 w-12 h-12 bg-gradient-to-br from-[#0891b2]/5 to-transparent rounded-full blur-2xl animate-pulse delay-3000"></div>
        <div className="absolute bottom-20 left-1/2 w-18 h-18 bg-gradient-to-br from-[#0ea5e9]/7 to-transparent rounded-full blur-3xl animate-pulse delay-2500"></div>

        {/* Floating geometric shapes */}
        <div className="absolute top-24 left-1/2 w-8 h-8 border border-[var(--color-primary)]/20 rounded-lg rotate-45 animate-pulse delay-750"></div>
        <div className="absolute top-36 right-16 w-6 h-6 bg-[var(--color-primary)]/15 rounded-full animate-pulse delay-1750"></div>
        <div className="absolute top-48 left-16 w-4 h-4 border border-[var(--color-primary)]/25 rounded-lg rotate-12 animate-pulse delay-2250"></div>
        <div className="absolute top-52 right-1/2 w-10 h-10 border border-[var(--color-primary)]/15 rounded-full animate-pulse delay-1250"></div>

        {/* Network connection lines */}
        <div className="absolute top-1/4 left-1/2 w-px h-32 bg-gradient-to-b from-transparent via-[var(--color-primary)]/15 to-transparent"></div>
        <div className="absolute top-1/3 right-1/3 w-24 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/15 to-transparent"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/10 to-transparent"></div>
        <div className="absolute top-2/3 right-1/4 w-px h-20 bg-gradient-to-b from-transparent via-[var(--color-primary)]/12 to-transparent"></div>

        {/* Floating dots with different sizes */}
        <div className="absolute top-16 left-1/2 w-2 h-2 bg-[var(--color-primary)]/25 rounded-full animate-pulse delay-500"></div>
        <div className="absolute top-28 right-16 w-1.5 h-1.5 bg-[var(--color-primary)]/20 rounded-full animate-pulse delay-2000"></div>
        <div className="absolute top-36 left-16 w-1 h-1 bg-[var(--color-primary)]/15 rounded-full animate-pulse delay-3500"></div>
        <div className="absolute top-52 right-1/2 w-2.5 h-2.5 bg-[var(--color-primary)]/30 rounded-full animate-pulse delay-1000"></div>

        {/* Diagonal lines */}
        <div className="absolute top-20 left-1/3 w-20 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/12 to-transparent transform rotate-45 origin-left"></div>
        <div className="absolute top-32 right-1/4 w-16 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/10 to-transparent transform -rotate-45 origin-right"></div>

        {/* Moving particles */}
        <div className="absolute top-20 left-20 w-1 h-1 bg-[var(--color-primary)]/40 rounded-full animate-bounce"></div>
        <div className="absolute top-40 right-40 w-0.5 h-0.5 bg-[#0ea5e9]/35 rounded-full animate-bounce delay-1000"></div>
        <div className="absolute bottom-40 left-40 w-1.5 h-1.5 bg-[#0891b2]/30 rounded-full animate-bounce delay-2000"></div>

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div
            className="absolute top-0 left-0 w-full h-full"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, var(--color-primary) 1px, transparent 0)`,
              backgroundSize: "20px 20px",
            }}
          ></div>
        </div>

        {/* Ambient glow */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[var(--color-primary)]/2 via-transparent to-[#0ea5e9]/1"></div>

        {/* Additional dynamic elements */}
        {/* Floating data streams */}
        <div className="absolute top-1/4 left-1/6 w-16 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/20 to-transparent animate-pulse delay-4000"></div>
        <div className="absolute top-3/4 right-1/6 w-20 h-px bg-gradient-to-r from-transparent via-[#0ea5e9]/15 to-transparent animate-pulse delay-5000"></div>

        {/* Pulsing connection nodes */}
        <div className="absolute top-1/3 left-1/3 w-3 h-3 bg-[var(--color-primary)]/30 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute top-2/3 right-1/3 w-2 h-2 bg-[#0891b2]/25 rounded-full animate-pulse delay-3000"></div>
        <div className="absolute bottom-1/3 left-1/2 w-2.5 h-2.5 bg-[#0ea5e9]/20 rounded-full animate-pulse delay-2000"></div>

        {/* Subtle corner accents */}
        <div className="absolute top-8 left-8 w-6 h-6 border-l-2 border-t-2 border-[var(--color-primary)]/15 rounded-tl-lg"></div>
        <div className="absolute top-8 right-8 w-6 h-6 border-r-2 border-t-2 border-[var(--color-primary)]/15 rounded-tr-lg"></div>
        <div className="absolute bottom-8 left-8 w-6 h-6 border-l-2 border-b-2 border-[var(--color-primary)]/15 rounded-bl-lg"></div>
        <div className="absolute bottom-8 right-8 w-6 h-6 border-r-2 border-b-2 border-[var(--color-primary)]/15 rounded-br-lg"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-gradient-to-r from-[rgba(15,15,35,0.95)] to-[rgba(15,15,35,0.85)] backdrop-blur-[20px] border-b border-[var(--color-border)] px-8 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="animate-bounce-in flex items-center gap-3">
              <Image
                src="/anypay-logo.svg"
                alt="AnyPay Logo"
                width={60}
                height={60}
                className="h-12 w-12 hover:scale-105 transition-transform duration-300"
              />
              <span className="text-3xl font-bold text-[var(--color-primary)] tracking-tight">
                AnyPay
              </span>
            </div>
            <div className="h-8 w-px bg-[var(--color-border)]"></div>
            <div className="text-[var(--color-text-secondary)]">
              Welcome back,{" "}
              <span className="text-[var(--color-primary)] font-semibold">
                {user ? user.username : "User"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-[var(--color-bg-card)] px-4 py-2 rounded-xl border border-[var(--color-border)]">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-[var(--color-text-secondary)]">
                Connected
              </span>
            </div>
            {user && (
              <div className="text-sm text-[var(--color-text-muted)] font-mono bg-[var(--color-bg-card)] px-4 py-2 rounded-xl border border-[var(--color-border)]">
                {user.walletAddress}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-[var(--color-primary)]/20 to-[var(--color-primary)]/30 text-[var(--color-primary)] px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-all duration-200 hover:shadow-sm hover:shadow-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 cursor-pointer"
            >
              Disconnect
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Side by Side Layout */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 py-8 h-[calc(100vh-10rem)]">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 h-full">
          {/* Left Side - Balances with Tabs */}
          <div className="flex flex-col h-full">
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab("owe")}
                className={`min-w-[120px] px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === "owe"
                    ? "bg-gradient-to-r from-red-100 to-red-200 text-red-700 shadow-sm shadow-red-100/20 border-0"
                    : "bg-gradient-to-r from-[var(--color-bg-card)] to-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-gradient-to-r hover:from-red-50/20 hover:to-red-100/20 hover:border-red-100/40 hover:text-red-600"
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
                You Owe
              </button>
              <button
                onClick={() => setActiveTab("owed")}
                className={`min-w-[120px] px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === "owed"
                    ? "bg-gradient-to-r from-green-100 to-emerald-200 text-green-700 shadow-sm shadow-green-100/20 border-0"
                    : "bg-gradient-to-r from-[var(--color-bg-card)] to-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-gradient-to-r hover:from-green-50/20 hover:to-green-100/20 hover:border-green-100/40 hover:text-green-600"
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Owed To You
              </button>
              <button
                onClick={() => setActiveTab("paid")}
                className={`min-w-[120px] px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === "paid"
                    ? "bg-gradient-to-r from-blue-100 to-cyan-200 text-blue-700 shadow-sm shadow-blue-100/20 border-0"
                    : "bg-gradient-to-r from-[var(--color-bg-card)] to-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-gradient-to-r hover:from-blue-50/20 hover:to-blue-100/20 hover:border-blue-100/40 hover:text-blue-600"
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                Paid
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-4 overflow-y-auto">
              {activeTab === "paid" ? (
                // Paid Payments Section
                <div>
                  {paymentsLoading ? (
                    <div className="text-center py-8 text-[var(--color-text-muted)]">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                          className="w-8 h-8 text-blue-500 animate-spin"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      </div>
                      <p>Loading your payments...</p>
                    </div>
                  ) : paidPayments.length === 0 ? (
                    <div className="text-center py-12 text-[var(--color-text-muted)]">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                          className="w-10 h-10 text-blue-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                        No Payment History
                      </h3>
                      <p className="text-[var(--color-text-muted)]">
                        Your completed transactions will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {paidPayments.map((item, index) => (
                        <div
                          key={index}
                          className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl p-4 hover:border-blue-100/50 transition-all duration-200"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-semibold text-[var(--color-text-primary)]">
                                Paid to{" "}
                                {item.recipientUser?.username || "Unknown"}
                              </p>
                              <p className="text-sm text-[var(--color-text-muted)] font-mono">
                                {item.recipientUser?.walletAddress ||
                                  item.recipient}
                              </p>
                              {item.description && (
                                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                                  {item.description}
                                </p>
                              )}
                              <p className="text-xs text-blue-500 mt-1">
                                ✅ Completed on{" "}
                                {new Date(item.paidAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-blue-500">
                                ${item.amount.toFixed(2)}
                              </p>
                              <p className="text-xs text-[var(--color-text-muted)]">
                                via{" "}
                                {item.tokenType === 0
                                  ? "USDC"
                                  : item.tokenType === 1
                                  ? "CCIP-BnM"
                                  : "CCIP-LnM"}
                              </p>
                            </div>
                          </div>

                          {/* Transaction Details */}
                          <div className="p-3 bg-blue-900/10 rounded-lg border border-blue-500/20">
                            {item.txHash && (
                              <div className="mb-3">
                                <span className="text-sm text-blue-600 font-medium block mb-1">
                                  Transaction Hash:
                                </span>
                                <a
                                  href={getExplorerUrl(
                                    item.txHash,
                                    item.sourceChain,
                                    item.tokenType || 0,
                                    item.messageId,
                                    item.sourceChain,
                                    item.destinationChain
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:text-blue-300 text-sm font-mono underline break-all"
                                >
                                  {item.txHash}
                                </a>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 text-xs text-[var(--color-text-muted)]">
                              <div>
                                <span className="font-medium">From:</span>{" "}
                                {CHAINS[item.sourceChain as keyof typeof CHAINS]
                                  ?.name || item.sourceChain}
                              </div>
                              <div>
                                <span className="font-medium">To:</span>{" "}
                                {CHAINS[
                                  item.destinationChain as keyof typeof CHAINS
                                ]?.name || item.destinationChain}
                              </div>
                            </div>

                            {/* CCIP Tracking */}
                            {item.messageId &&
                              item.messageId !== "pending" &&
                              item.messageId !== "direct-transfer" && (
                                <div className="mt-2">
                                  <a
                                    href={`https://ccip.chain.link/msg/${item.messageId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:text-blue-300 text-sm underline"
                                  >
                                    🔗 Track CCIP Message →
                                  </a>
                                </div>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeTab === "owe" ? (
                // You Owe Section
                <div>
                  {paymentsLoading ? (
                    <div className="text-center py-8 text-[var(--color-text-muted)]">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                          className="w-8 h-8 text-blue-500 animate-spin"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      </div>
                      <p>Loading your payments...</p>
                    </div>
                  ) : youOwe.length === 0 ? (
                    <div className="text-center py-12 text-[var(--color-text-muted)]">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                          className="w-10 h-10 text-blue-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                        All Caught Up!
                      </h3>
                      <p className="text-[var(--color-text-muted)]">
                        No outstanding debts to worry about
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {youOwe.map((item, index) => (
                        <div
                          key={index}
                          className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl p-4 hover:border-red-100/50 transition-all duration-200"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-semibold text-[var(--color-text-primary)]">
                                {item.user.username}
                              </p>
                              <p className="text-sm text-[var(--color-text-muted)] font-mono">
                                {item.user.walletAddress}
                              </p>
                              {item.description && (
                                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-white">
                                ${item.amount.toFixed(2)}
                              </p>
                            </div>
                          </div>

                          {/* Cross-chain payment tracking */}
                          {item.crossChainPayments &&
                            item.crossChainPayments.length > 0 && (
                              <div className="mb-3 p-2 bg-blue-900/20 rounded-lg border border-blue-500/30">
                                <p className="text-xs text-blue-300 mb-1">
                                  🔗 CCIP Transactions:
                                </p>
                                {item.crossChainPayments.map(
                                  (ccipTx: any, ccipIndex: number) => (
                                    <div
                                      key={ccipIndex}
                                      className="text-xs text-blue-200 space-y-1"
                                    >
                                      <div className="flex justify-between items-center">
                                        <span>
                                          {ccipTx.status || "Processing"}
                                        </span>
                                        {ccipTx.txHash && (
                                          <a
                                            href={`${
                                              CHAINS[
                                                ccipTx.sourceChain as keyof typeof CHAINS
                                              ]?.explorerUrl || "#"
                                            }${ccipTx.txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-300 hover:text-blue-100 underline"
                                          >
                                            View Tx
                                          </a>
                                        )}
                                      </div>
                                      {ccipTx.messageId &&
                                        ccipTx.messageId !== "pending" && (
                                          <div className="flex justify-between items-center">
                                            <span>CCIP Message:</span>
                                            <a
                                              href={`https://ccip.chain.link/msg/${ccipTx.messageId}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-300 hover:text-blue-100 underline"
                                            >
                                              Track CCIP
                                            </a>
                                          </div>
                                        )}
                                    </div>
                                  )
                                )}
                              </div>
                            )}

                          <button
                            onClick={() =>
                              handlePayUser(
                                item.user,
                                item.amount,
                                item.paymentId
                              )
                            }
                            className="w-full bg-gradient-to-r from-red-300/20 to-red-300/30 text-red-300 py-3 rounded-lg font-semibold cursor-pointer transition-all duration-200 hover:shadow-sm hover:shadow-red-300/20 border border-red-300/30"
                          >
                            <div className="flex items-center justify-center gap-2">
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                                />
                              </svg>
                              Pay ${item.amount.toFixed(2)} Cross-Chain
                            </div>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeTab === "owed" ? (
                // Owed To You Section
                <div>
                  {paymentsLoading ? (
                    <div className="text-center py-8 text-[var(--color-text-muted)]">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                          className="w-8 h-8 text-blue-500 animate-spin"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      </div>
                      <p>Loading your payments...</p>
                    </div>
                  ) : owedToYou.length === 0 ? (
                    <div className="text-center py-12 text-[var(--color-text-muted)]">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                          className="w-10 h-10 text-blue-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                        All Settled Up!
                      </h3>
                      <p className="text-[var(--color-text-muted)]">
                        No pending payments owed to you
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {owedToYou.map((item, index) => (
                        <div
                          key={index}
                          className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl p-4 hover:border-green-100/50 transition-all duration-200"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-semibold text-[var(--color-text-primary)]">
                                {item.user.username}
                              </p>
                              <p className="text-sm text-[var(--color-text-muted)] font-mono">
                                {item.user.walletAddress}
                              </p>
                              {item.description && (
                                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-green-300">
                                ${item.amount.toFixed(2)}
                              </p>
                              <p className="text-xs text-[var(--color-text-muted)]">
                                Pending
                              </p>
                            </div>
                          </div>

                          {/* Cross-chain payment tracking */}
                          {item.crossChainPayments &&
                            item.crossChainPayments.length > 0 && (
                              <div className="p-2 bg-green-900/20 rounded-lg border border-green-500/30">
                                <p className="text-xs text-green-300 mb-1">
                                  🔗 CCIP Transactions:
                                </p>
                                {item.crossChainPayments.map(
                                  (ccipTx: any, ccipIndex: number) => (
                                    <div
                                      key={ccipIndex}
                                      className="text-xs text-green-200 space-y-1"
                                    >
                                      <div className="flex justify-between items-center">
                                        <span>
                                          {ccipTx.status || "Processing"}
                                        </span>
                                        {ccipTx.txHash && (
                                          <a
                                            href={`${
                                              CHAINS[
                                                ccipTx.sourceChain as keyof typeof CHAINS
                                              ]?.explorerUrl || "#"
                                            }${ccipTx.txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-green-300 hover:text-green-100 underline"
                                          >
                                            View Tx
                                          </a>
                                        )}
                                      </div>
                                      {ccipTx.messageId &&
                                        ccipTx.messageId !== "pending" && (
                                          <div className="flex justify-between items-center">
                                            <span>CCIP Message:</span>
                                            <a
                                              href={`https://ccip.chain.link/msg/${ccipTx.messageId}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-green-300 hover:text-green-100 underline"
                                            >
                                              Track CCIP
                                            </a>
                                          </div>
                                        )}
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {/* Right Side - AI Chatbot */}
          <div className="bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-6 flex flex-col h-full">
            {/* Chat Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary)]/10 rounded-xl flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-[var(--color-primary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
                  AI Assistant
                </h2>
                <p className="text-[var(--color-text-muted)]">
                  Upload receipts and chat with your financial AI
                  <br />
                </p>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl p-3 mb-6 overflow-y-auto h-80 scrollbar-thin scrollbar-thumb-[var(--color-primary)]/20 scrollbar-track-transparent hover:scrollbar-thumb-[var(--color-primary)]/30">
              {chatHistory.length === 0 ? (
                <div className="text-center py-8 text-[var(--color-text-muted)]">
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary)]/10 rounded-2xl flex items-center justify-center mx-auto">
                      <svg
                        className="w-8 h-8 text-[var(--color-primary)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                      </svg>
                    </div>
                  </div>
                  <p className="text-lg mb-2">
                    Welcome to your AI Financial Assistant!
                  </p>
                  <p>
                    Upload a receipt image or ask me anything about your
                    expenses.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {chatHistory.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md ${
                          message.role === "user"
                            ? "bg-[var(--color-primary)] text-white"
                            : "bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                        } rounded-2xl p-4`}
                      >
                        {message.image && (
                          <div className="mb-3">
                            <img
                              src={message.image}
                              alt="Receipt"
                              className="max-w-full h-32 object-cover rounded-lg border border-white/20"
                            />
                          </div>
                        )}
                        {message.role === "bot" ? (
                          <div className="prose prose-sm max-w-none prose-invert">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                // Customize markdown components for better styling
                                h1: ({ ...props }) => (
                                  <h1
                                    className="text-lg font-bold mb-2"
                                    {...props}
                                  />
                                ),
                                h2: ({ ...props }) => (
                                  <h2
                                    className="text-base font-bold mb-2"
                                    {...props}
                                  />
                                ),
                                h3: ({ ...props }) => (
                                  <h3
                                    className="text-sm font-bold mb-1"
                                    {...props}
                                  />
                                ),
                                p: ({ ...props }) => (
                                  <p className="mb-2 last:mb-0" {...props} />
                                ),
                                ul: ({ ...props }) => (
                                  <ul
                                    className="list-disc pl-4 mb-2"
                                    {...props}
                                  />
                                ),
                                ol: ({ ...props }) => (
                                  <ol
                                    className="list-decimal pl-4 mb-2"
                                    {...props}
                                  />
                                ),
                                li: ({ ...props }) => (
                                  <li className="mb-1" {...props} />
                                ),
                                code: ({ children, ...props }) => (
                                  <code
                                    className="bg-black/20 text-[var(--color-primary)] px-1 py-0.5 rounded text-xs"
                                    {...props}
                                  >
                                    {children}
                                  </code>
                                ),
                                pre: ({ ...props }) => (
                                  <pre
                                    className="bg-black/20 p-2 rounded text-xs overflow-x-auto mb-2"
                                    {...props}
                                  />
                                ),
                                blockquote: ({ ...props }) => (
                                  <blockquote
                                    className="border-l-2 border-[var(--color-primary)] pl-2 italic mb-2"
                                    {...props}
                                  />
                                ),
                                strong: ({ ...props }) => (
                                  <strong className="font-bold" {...props} />
                                ),
                                em: ({ ...props }) => (
                                  <em className="italic" {...props} />
                                ),
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">
                            {message.content}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-pulse"></div>
                          <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-pulse delay-150"></div>
                          <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-pulse delay-300"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selected Users */}
            <div className="mb-3">
              <SelectedUsers
                users={usersSelected}
                onRemoveUser={handleRemoveUser}
              />
            </div>

            {/* Image Preview */}
            {image && (
              <div className="mb-3 p-3 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[var(--color-text-muted)]">
                    Receipt Image Ready
                  </span>
                  <button
                    onClick={removeImage}
                    className="text-red-400 hover:text-red-300 text-sm hover:scale-110 transition-transform duration-200 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
                <img
                  src={image}
                  alt="Receipt Preview"
                  className="max-w-full h-24 object-cover rounded-lg"
                />
              </div>
            )}

            {/* Input Area */}
            <div className="flex flex-col sm:flex-row gap-3 relative">
              <div className="flex-1 min-w-0">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your expenses or upload a receipt... (Type @ to mention users)"
                  className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-xl px-4 py-3 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all duration-200"
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                />
              </div>

              <div className="flex gap-2 sm:gap-3 flex-shrink-0">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative group cursor-pointer overflow-hidden px-4 sm:px-5 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                    image
                      ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/40 text-green-400 shadow-lg shadow-green-500/20"
                      : "bg-gradient-to-r from-[var(--color-primary)]/10 to-[#0ea5e9]/10 border-2 border-[var(--color-primary)]/30 text-[var(--color-primary)] hover:bg-gradient-to-r hover:from-[var(--color-primary)]/20 hover:to-[#0ea5e9]/20 hover:border-[var(--color-primary)]/50 hover:shadow-lg hover:shadow-[var(--color-primary)]/20"
                  }`}
                  title={
                    image ? "Replace Image (1 max)" : "Upload Image (1 max)"
                  }
                  disabled={isLoading}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-5 h-5 transition-all duration-300 ${
                        image ? "scale-110" : "group-hover:scale-110"
                      }`}
                    >
                      {image ? (
                        <svg
                          className="w-full h-full"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-full h-full"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-medium hidden sm:inline">
                      {image ? "Replace" : "Upload"}
                    </span>
                  </div>

                  {/* Subtle glow effect */}
                  <div
                    className={`absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 ${
                      image
                        ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10"
                        : "bg-gradient-to-r from-[var(--color-primary)]/10 to-[#0ea5e9]/10"
                    } group-hover:opacity-100`}
                  ></div>
                </button>

                <button
                  onClick={handleSendMessage}
                  disabled={(!input.trim() && !image) || isLoading}
                  className="bg-gradient-to-r from-[var(--color-primary)] to-[#0ea5e9] text-white px-4 sm:px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-all duration-200 hover:shadow-lg hover:shadow-[var(--color-primary)]/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 whitespace-nowrap border-0 cursor-pointer"
                >
                  {isLoading ? "Sending..." : "Send"}
                </button>
              </div>

              {/* User Mention Dropdown - Positioned relative to input container */}
              <UserMentionDropdown
                isOpen={mentionDropdown.isOpen}
                searchTerm={mentionDropdown.searchTerm}
                onSelectUser={handleSelectUser}
                onClose={closeMentionDropdown}
                position={mentionDropdown.position}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal({ isOpen: false })}
        recipientUser={
          paymentModal.recipientUser || { username: "", walletAddress: "" }
        }
        amount={paymentModal.amount || 0}
        onConfirm={handlePaymentConfirm}
      />

      {/* Transaction Progress Modal */}
      <TransactionModal
        isOpen={transactionState.isProcessing}
        status={transactionState.status}
        step={transactionState.step}
        totalSteps={transactionState.totalSteps}
        txHash={transactionState.txHash}
      />

      {/* Simple Transaction Success Notification */}
      {transactionState.status &&
        !transactionState.isProcessing &&
        transactionState.txHash && (
          <div className="fixed top-4 right-4 z-50 bg-green-600 border border-green-500 rounded-lg p-4 max-w-md shadow-lg">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-sm text-white font-medium">
                  ✅ {transactionState.status}
                </p>
                <p className="text-xs text-green-100 mt-1">Transaction Hash:</p>
                <a
                  href={getExplorerUrl(
                    transactionState.txHash,
                    transactionState.sourceChain || "84532",
                    transactionState.tokenType || 0,
                    undefined,
                    transactionState.sourceChain,
                    transactionState.sourceChain // This will be updated when we have destination chain
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-100 hover:text-white text-xs font-mono underline break-all"
                >
                  {transactionState.txHash}
                </a>
              </div>
              <button
                onClick={() =>
                  setTransactionState((prev) => ({
                    ...prev,
                    status: "",
                    txHash: undefined,
                  }))
                }
                className="text-green-200 hover:text-white ml-2 text-sm"
              >
                ✕
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
