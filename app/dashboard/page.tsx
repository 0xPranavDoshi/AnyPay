"use client";

import { useState, useRef, useEffect } from "react";
import { CrossChainPayment, PaymentStatus, TokenType } from "@/lib/interface";
import PaymentModal from "@/components/PaymentModal";
import TransactionModal from "@/components/TransactionModal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

export default function Dashboard() {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<"owe" | "owed">("owe");
  const [user, setUser] = useState<User | null>(null);
  const [crossChainPayments, setCrossChainPayments] = useState<CrossChainPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    recipientUser?: { username: string; walletAddress: string };
    amount?: number;
  }>({ isOpen: false });
  const [transactionState, setTransactionState] = useState<{
    isProcessing: boolean;
    status: string;
    txHash?: string;
    step: number;
    totalSteps: number;
  }>({ isProcessing: false, status: "", step: 0, totalSteps: 4 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get user from cookies and fetch payments on component mount
  useEffect(() => {
    const getUserData = () => {
      // Client-side cookie parsing
      const cookies = document.cookie.split(';');
      const userCookie = cookies.find(cookie => cookie.trim().startsWith('user='));
      if (userCookie) {
        try {
          const userData = JSON.parse(decodeURIComponent(userCookie.split('=')[1]));
          setUser(userData);
          fetchUserPayments(userData.walletAddress);
        } catch (error) {
          console.error("Error parsing user cookie:", error);
        }
      }
    };
    getUserData();
  }, []);

  // Fetch cross-chain payments for user
  const fetchUserPayments = async (userAddress: string) => {
    try {
      setPaymentsLoading(true);
      const response = await fetch(`/api/pay?userAddress=${userAddress}`);
      if (response.ok) {
        const data = await response.json();
        setCrossChainPayments(data.payments || []);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setPaymentsLoading(false);
    }
  };

  // Remove old payment gateway logic - no longer needed

  // Removed processMessageAfterPayment - no longer needed

  // Mock data for now - will be replaced with real payment data
  const youOwe = [
    { user: { username: "alice", walletAddress: "0x123..." }, amount: 45.67 },
    { user: { username: "bob", walletAddress: "0x456..." }, amount: 23.5 },
    { user: { username: "charlie", walletAddress: "0x789..." }, amount: 89.99 },
  ];

  const owedToYou = [
    { user: { username: "david", walletAddress: "0xabc..." }, amount: 12.75 },
    { user: { username: "eve", walletAddress: "0xdef..." }, amount: 34.2 },
    { user: { username: "frank", walletAddress: "0xghi..." }, amount: 67.8 },
  ];

  const handlePayUser = (targetUser: User, amount: number) => {
    setPaymentModal({
      isOpen: true,
      recipientUser: targetUser,
      amount
    });
  };

  const handlePaymentConfirm = async (paymentData: {
    sourceChain: string;
    destinationChain: string;
    tokenType: TokenType;
  }) => {
    if (!paymentModal.recipientUser || !paymentModal.amount) return;

    try {
      // Start transaction process
      setTransactionState({
        isProcessing: true,
        status: "Connecting to wallet...",
        step: 1,
        totalSteps: 4
      });

      // Step 1: Connect wallet & switch chain (simulated)
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTransactionState(prev => ({
        ...prev,
        status: "Requesting token approval...",
        step: 2
      }));

      // Step 2: Token approval (simulated)
      await new Promise(resolve => setTimeout(resolve, 1500));
      setTransactionState(prev => ({
        ...prev,
        status: "Confirming cross-chain transaction...",
        step: 3
      }));

      // Step 3: Transaction signing and submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientAddress: paymentModal.recipientUser.walletAddress,
          amount: paymentModal.amount,
          sourceChain: paymentData.sourceChain,
          destinationChain: paymentData.destinationChain,
          tokenType: paymentData.tokenType,
          signedTxData: "0x..." // Would contain actual signed transaction
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setTransactionState(prev => ({
          ...prev,
          status: "Transaction confirmed!",
          step: 4,
          txHash: result.txHash
        }));
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setPaymentModal({ isOpen: false });
        setTransactionState({
          isProcessing: false,
          status: "",
          step: 0,
          totalSteps: 4
        });
        
        if (user) {
          fetchUserPayments(user.walletAddress);
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Payment error:", error);
      setTransactionState({
        isProcessing: false,
        status: "Transaction failed",
        step: 0,
        totalSteps: 4
      });
      setTimeout(() => {
        setTransactionState({
          isProcessing: false,
          status: "",
          step: 0,
          totalSteps: 4
        });
      }, 3000);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
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
    setChatHistory(prev => [...prev, userMessage]);

    // Clear the input fields and image
    setInput("");
    setImage(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";

    setIsLoading(true);

    try {
      // Send message to agent API with streaming
      const payload: any = {
        prompt: messageContent,
        image: messageImage,
        stream: true,
      };
      // Refresh session on page load (first message after refresh)
      if (isFirstClientMessage) {
        payload.refresh_session = true;
      } else {
        payload.refresh_session = false;
        if (sessionId) payload.sessionID = sessionId;
      }

      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let streamingContent = "";

      if (reader) {
        // Add initial bot message for streaming
        setChatHistory(prev => [...prev, {
          role: "bot",
          content: "",
        }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                setIsLoading(false);
                return;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content') {
                  streamingContent = parsed.content;
                  // Update the last message (bot message) with streaming content
                  setChatHistory(prev => {
                    const updated = [...prev];
                    if (updated[updated.length - 1]?.role === 'bot') {
                      updated[updated.length - 1].content = streamingContent;
                    }
                    return updated;
                  });
                } else if (parsed.type === 'metadata') {
                  // Handle bill splitting metadata if needed
                  console.log('Bill splitting state:', parsed.billSplitting);
                  // Capture and persist server-provided sessionId for follow-ups
                  if (parsed.sessionId) {
                    setSessionId(parsed.sessionId);
                  }
                }
              } catch (e) {
                console.error('Error parsing streaming data:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setChatHistory(prev => [...prev, {
        role: "bot",
        content: "Sorry, I encountered an error processing your message. Please try again.",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-[var(--color-primary)]/5 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-[var(--color-primary)]/8 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-32 left-1/3 w-28 h-28 bg-gradient-to-br from-[var(--color-primary)]/6 to-transparent rounded-full blur-3xl animate-pulse delay-2000"></div>
        <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-gradient-to-br from-[var(--color-primary)]/4 to-transparent rounded-full blur-3xl animate-pulse delay-1500"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-gradient-to-r from-[rgba(15,15,35,0.95)] to-[rgba(15,15,35,0.85)] backdrop-blur-[20px] border-b border-[var(--color-border)] px-8 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="animate-bounce-in text-3xl font-bold text-[var(--color-primary)] tracking-tight">
              AnyPay
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
            <button className="bg-[var(--color-primary)] text-white px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-all duration-200">
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
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  activeTab === "owe"
                    ? "bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/30"
                    : "bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/30"
                }`}
              >
                You Owe
              </button>
              <button
                onClick={() => setActiveTab("owed")}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  activeTab === "owed"
                    ? "bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/30"
                    : "bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/30"
                }`}
              >
                Owed To You
              </button>
            </div>

            {/* Tab Content */}
            <div className="h-[520px] bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-6 overflow-y-auto">
              {activeTab === "owe" ? (
                // You Owe Section
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500/20 to-red-500/10 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">💸</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
                        You Owe
                      </h2>
                      <p className="text-[var(--color-text-muted)]">
                        People you need to pay back
                      </p>
                    </div>
                  </div>

                  {youOwe.length === 0 ? (
                    <div className="text-center py-8 text-[var(--color-text-muted)]">
                      <div className="text-4xl mb-2">🎉</div>
                      <p>You&apos;re all caught up! No outstanding debts.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {youOwe.map((item, index) => (
                        <div
                          key={index}
                          className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl p-4 hover:border-[var(--color-primary)]/30 transition-all duration-200"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-semibold text-[var(--color-text-primary)]">
                                {item.user.username}
                              </p>
                              <p className="text-sm text-[var(--color-text-muted)] font-mono">
                                {item.user.walletAddress}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-red-400">
                                ${item.amount.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              handlePayUser(item.user, item.amount)
                            }
                            className="w-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary)]/80 text-white py-3 rounded-lg font-semibold hover:scale-105 transition-all duration-200 hover:shadow-lg hover:shadow-[var(--color-primary)]/30"
                          >
                            Pay ${item.amount.toFixed(2)}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Owed To You Section
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-green-500/10 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">💰</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
                        Owed To You
                      </h2>
                      <p className="text-[var(--color-text-muted)]">
                        People who owe you money
                      </p>
                    </div>
                  </div>

                  {owedToYou.length === 0 ? (
                    <div className="text-center py-8 text-[var(--color-text-muted)]">
                      <div className="text-4xl mb-2">📝</div>
                      <p>No pending payments owed to you.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {owedToYou.map((item, index) => (
                        <div
                          key={index}
                          className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl p-4 hover:border-green-500/30 transition-all duration-200"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-[var(--color-text-primary)]">
                                {item.user.username}
                              </p>
                              <p className="text-sm text-[var(--color-text-muted)] font-mono">
                                {item.user.walletAddress}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-green-400">
                                ${item.amount.toFixed(2)}
                              </p>
                              <p className="text-xs text-[var(--color-text-muted)]">
                                Pending
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Side - AI Chatbot */}
          <div className="bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-6 flex flex-col h-full">
            {/* Chat Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary)]/10 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🤖</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
                  AI Assistant
                </h2>
                <p className="text-[var(--color-text-muted)]">
                  Upload receipts and chat with your financial AI
                  <br />
                  <span className="text-xs">Supports markdown formatting</span>
                </p>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="h-[370px] bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl p-4 mb-4 overflow-y-auto">
              {chatHistory.length === 0 ? (
                <div className="text-center py-16 text-[var(--color-text-muted)]">
                  <div className="text-6xl mb-4">🤖</div>
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
                                h1: ({...props}) => <h1 className="text-lg font-bold mb-2" {...props} />,
                                h2: ({...props}) => <h2 className="text-base font-bold mb-2" {...props} />,
                                h3: ({...props}) => <h3 className="text-sm font-bold mb-1" {...props} />,
                                p: ({...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                ul: ({...props}) => <ul className="list-disc pl-4 mb-2" {...props} />,
                                ol: ({...props}) => <ol className="list-decimal pl-4 mb-2" {...props} />,
                                li: ({...props}) => <li className="mb-1" {...props} />,
                                code: ({children, ...props}) => (
                                  <code className="bg-black/20 text-[var(--color-primary)] px-1 py-0.5 rounded text-xs" {...props}>
                                    {children}
                                  </code>
                                ),
                                pre: ({...props}) => <pre className="bg-black/20 p-2 rounded text-xs overflow-x-auto mb-2" {...props} />,
                                blockquote: ({...props}) => <blockquote className="border-l-2 border-[var(--color-primary)] pl-2 italic mb-2" {...props} />,
                                strong: ({...props}) => <strong className="font-bold" {...props} />,
                                em: ({...props}) => <em className="italic" {...props} />,
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-bounce delay-100"></div>
                          <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-bounce delay-200"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Image Preview */}
            {image && (
              <div className="mb-4 p-4 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[var(--color-text-muted)]">
                    Receipt Image Ready
                  </span>
                  <button
                    onClick={removeImage}
                    className="text-red-400 hover:text-red-300 text-sm hover:scale-110 transition-transform duration-200"
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
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your expenses or upload a receipt..."
                className="flex-1 bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-xl px-4 py-3 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all duration-200"
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              />

              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageUpload}
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className={`bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-4 py-3 rounded-xl hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all duration-200 hover:scale-105 ${image ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : ''}`}
                title={image ? "Replace Image (1 max)" : "Upload Image (1 max)"}
                disabled={isLoading}
              >
                {image ? '🖼️' : '📷'}
              </button>

              <button
                onClick={handleSendMessage}
                disabled={(!input.trim() && !image) || isLoading}
                className="bg-[var(--color-primary)] text-white px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-all duration-200 hover:shadow-lg hover:shadow-[var(--color-primary)]/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isLoading ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal({ isOpen: false })}
        recipientUser={paymentModal.recipientUser || { username: "", walletAddress: "" }}
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
    </div>
  );
}
