"use client";
import { useState, useEffect, useRef } from "react";
import { usePayments } from "./usePayments";
import { Payment } from "@/lib/interface";
import { getCookie } from "@/utils/cookie";

export default function Dashboard() {
    const [tab, setTab] = useState<"whoYouOwe" | "owedToYou">("whoYouOwe");
    const [username, setUsername] = useState<string | null>(null);
    const { youOwe, owedToYou, loading, error } = usePayments(username || "");
    // Chat state
    const [chatHistory, setChatHistory] = useState<{ role: "user" | "bot"; content: string; image?: string }[]>([]);
    const [input, setInput] = useState("");
    const [image, setImage] = useState<string | undefined>(undefined);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const userCookie = getCookie("user");
        if (userCookie) {
            try {
                const user = JSON.parse(userCookie);
                setUsername(user.username);
            } catch {
                setUsername(null);
            }
        } else {
            setUsername(null);
        }
    }, []);

    // Placeholder for the function that takes message, image, and username and returns markdown string
    async function getBotResponse(message: string, username: string, image?: string): Promise<string> {
        // TODO: Implement actual logic. For now, echo as markdown.
        let resp = `**Bot:** You said: ${message}`;
        if (image) resp += "\n\n![Uploaded Image](data:image/*;base64," + image.split(",")[1] + ")";
        return resp;
    }

    async function handleSendMessage() {
        if ((!input.trim() && !image) || !username) return;
        const userMsg = { role: "user" as const, content: input, image };
        setChatHistory(prev => [...prev, userMsg]);
        setInput("");
        setImage(undefined);
        // Get bot response
        const botMarkdown = await getBotResponse(userMsg.content, username, userMsg.image);
        setChatHistory(prev => [...prev, { role: "bot", content: botMarkdown }]);
    }

    function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === "string") {
                setImage(reader.result);
                // Reset input value after processing so same file can be uploaded again
                if (e.target) e.target.value = "";
            }
        };
        reader.readAsDataURL(file);
    }

    function renderYouOwe(payments: Payment[]) {
        if (!username) return <div className="text-center text-lg text-red-500">No username found. Please log in.</div>;
        if (loading) return <div className="text-center text-lg opacity-70">Loading...</div>;
        if (error) return <div className="text-center text-lg text-red-500">{error}</div>;
        // Flatten: For each payment where user is a sender, show recipient and amount owed
        const rows: { recipient: Payment['recipient'], amount: number }[] = [];
        payments.forEach(payment => {
            payment.senders?.forEach(sender => {
                if (sender.user.username === username) {
                    rows.push({ recipient: payment.recipient, amount: sender.amount });
                }
            });
        });
        if (rows.length === 0) return <div className="text-center text-lg opacity-70">No data yet.</div>;
        return rows.map((row, idx) => (
            <div key={idx} className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg p-4 shadow flex flex-row justify-between items-center">
                <span className="font-medium">{row.recipient?.username || row.recipient?.walletAddress}</span>
                <span className="font-mono text-[var(--color-primary)]">${row.amount.toFixed(2)}</span>
            </div>
        ));
    }

    function renderOwedToYou(payments: Payment[]) {
        if (!username) return <div className="text-center text-lg text-red-500">No username found. Please log in.</div>;
        if (loading) return <div className="text-center text-lg opacity-70">Loading...</div>;
        if (error) return <div className="text-center text-lg text-red-500">{error}</div>;
        // Flatten: For each payment where user is recipient, show each sender and amount
        const rows: { sender: { username: string; walletAddress: string }, amount: number }[] = [];
        payments.forEach(payment => {
            if (payment.recipient.username === username) {
                payment.senders?.forEach(sender => {
                    rows.push({ sender: sender.user, amount: sender.amount });
                });
            }
        });
        if (rows.length === 0) return <div className="text-center text-lg opacity-70">No data yet.</div>;
        return rows.map((row, idx) => (
            <div key={idx} className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg p-4 shadow flex flex-row justify-between items-center">
                <span className="font-medium">{row.sender?.username || row.sender?.walletAddress}</span>
                <span className="font-mono text-[var(--color-primary)]">${row.amount.toFixed(2)}</span>
            </div>
        ));
    }

    return (
        <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-['Poppins',Inter,'SF_Pro_Display',system-ui,sans-serif]">
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[rgba(15,15,35,0.9)] backdrop-blur-[20px] border-b border-[var(--color-border)] px-8 py-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="text-2xl font-bold text-[var(--color-primary)] tracking-tight">
                        AnyPay Dashboard
                    </div>
                </div>
            </nav>
            <section className="full-height bg-[var(--color-bg-primary)] pt-24 pb-24 flex flex-col justify-center items-center relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    {/* Floating geometric shapes */}
                    <div className="absolute top-20 left-10 w-16 h-16 border border-[var(--color-primary)]/20 rounded-lg rotate-45 animate-pulse"></div>
                    <div className="absolute top-32 right-20 w-8 h-8 bg-[var(--color-primary)]/10 rounded-full animate-pulse delay-1000"></div>
                    <div className="absolute top-40 left-1/3 w-12 h-12 border border-[var(--color-primary)]/15 rounded-full animate-pulse delay-2000"></div>
                    <div className="absolute top-24 right-1/4 w-10 h-10 border border-[var(--color-primary)]/25 rounded-lg rotate-12 animate-pulse delay-1500"></div>
                    <div className="absolute top-48 left-1/5 w-6 h-6 bg-[var(--color-primary)]/15 rounded-full animate-pulse delay-3000"></div>

                    {/* Gradient orbs */}
                    <div className="absolute bottom-40 right-10 w-24 h-24 bg-gradient-to-br from-[var(--color-primary)]/20 to-transparent rounded-full blur-xl animate-pulse delay-1500"></div>
                    <div className="absolute bottom-20 left-1/4 w-20 h-20 bg-gradient-to-br from-[var(--color-primary)]/15 to-transparent rounded-full blur-xl animate-pulse delay-500"></div>
                    <div className="absolute bottom-32 right-1/3 w-16 h-16 bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent rounded-full blur-xl animate-pulse delay-2500"></div>
                    <div className="absolute bottom-48 left-1/2 w-12 h-12 bg-gradient-to-br from-[var(--color-primary)]/20 to-transparent rounded-full blur-xl animate-pulse delay-1000"></div>

                    {/* Network connection lines */}
                    <div className="absolute top-1/4 left-1/2 w-px h-32 bg-gradient-to-b from-transparent via-[var(--color-primary)]/20 to-transparent"></div>
                    <div className="absolute top-1/3 right-1/3 w-24 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/20 to-transparent"></div>
                    <div className="absolute top-1/2 left-1/4 w-16 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/15 to-transparent"></div>
                    <div className="absolute top-2/3 right-1/4 w-px h-20 bg-gradient-to-b from-transparent via-[var(--color-primary)]/15 to-transparent"></div>

                    {/* Floating dots with different sizes */}
                    <div className="absolute top-16 left-1/2 w-2 h-2 bg-[var(--color-primary)]/30 rounded-full animate-pulse delay-500"></div>
                    <div className="absolute top-28 right-16 w-1.5 h-1.5 bg-[var(--color-primary)]/25 rounded-full animate-pulse delay-2000"></div>
                    <div className="absolute top-36 left-16 w-1 h-1 bg-[var(--color-primary)]/20 rounded-full animate-pulse delay-3500"></div>
                    <div className="absolute top-52 right-1/2 w-2.5 h-2.5 bg-[var(--color-primary)]/35 rounded-full animate-pulse delay-1000"></div>

                    {/* Diagonal lines */}
                    <div className="absolute top-20 left-1/3 w-20 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/20 to-transparent transform rotate-45 origin-left"></div>
                    <div className="absolute top-32 right-1/4 w-16 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/15 to-transparent transform -rotate-45 origin-right"></div>
                </div>
                <div className="z-10 flex flex-col items-center justify-center h-full w-full gap-8 mt-12">
                    <h1 className="text-3xl font-bold mb-8">Hey {username || "testPerson"}</h1>
                    <div className="flex flex-row items-stretch justify-center w-full gap-8 h-full min-h-[400px]">
                        {/* Left Box with Tabs */}
                        <div className="bg-[var(--color-bg-secondary,rgba(255,255,255,0.05))] rounded-xl shadow-lg p-8 w-full max-w-md flex flex-col h-full">
                            {/* Wallet address is hardcoded for now; remove input */}
                            <div className="flex mb-4">
                                <button
                                    className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ${tab === "whoYouOwe"
                                        ? "bg-[var(--color-primary)] text-white"
                                        : "bg-transparent text-[var(--color-text-secondary)]"
                                        }`}
                                    onClick={() => setTab("whoYouOwe")}
                                >
                                    Who You Owe
                                </button>
                                <button
                                    className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ml-2 ${tab === "owedToYou"
                                        ? "bg-[var(--color-primary)] text-white"
                                        : "bg-transparent text-[var(--color-text-secondary)]"
                                        }`}
                                    onClick={() => setTab("owedToYou")}
                                >
                                    Owed To You
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {tab === "whoYouOwe" ? renderYouOwe(youOwe) : renderOwedToYou(owedToYou)}
                            </div>
                        </div>
                        {/* Right Box: Chat */}
                        <div className="bg-[var(--color-bg-secondary,rgba(255,255,255,0.05))] rounded-xl shadow-lg p-8 w-full max-w-md flex flex-col h-full">
                            <h2 className="text-2xl font-semibold mb-4">Chat</h2>
                            <div className="flex-1 overflow-y-auto mb-4 space-y-4" style={{ maxHeight: 300 }}>
                                {chatHistory.map((msg, idx) => (
                                    <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                                        <div className={`px-4 py-2 rounded-lg max-w-xs whitespace-pre-wrap ${msg.role === "user" ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)]"}`}>
                                            {msg.role === "user" ? (
                                                <>
                                                    {msg.content}
                                                    {msg.image && (
                                                        <img src={msg.image} alt="Uploaded" className="mt-2 rounded max-w-full max-h-32 border" />
                                                    )}
                                                </>
                                            ) : <span dangerouslySetInnerHTML={{ __html: msg.content }} />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <form
                                className="flex gap-2 mt-auto"
                                onSubmit={e => {
                                    e.preventDefault();
                                    if ((!input.trim() && !image) || !username) return;
                                    handleSendMessage();
                                }}
                            >
                                <input
                                    type="text"
                                    className="flex-1 rounded-lg border border-[var(--color-border)] px-4 py-2 bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                                    placeholder="Type your message..."
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    disabled={!username}
                                />
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                />
                                <button
                                    type="button"
                                    className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={!username || !!image}
                                >
                                    Upload Receipt
                                </button>
                                <button
                                    type="submit"
                                    className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                                    disabled={(!input.trim() && !image) || !username}
                                >
                                    Send
                                </button>
                            </form>
                            {/* Only show preview if image is selected and not yet sent */}
                            {image && (
                                <div className="mt-2 flex flex-col items-start gap-1 relative w-fit">
                                    <div className="relative">
                                        <button
                                            type="button"
                                            className="absolute -top-2 -left-2 bg-white text-red-500 hover:bg-red-100 hover:text-red-700 text-lg font-bold w-6 h-6 rounded-full flex items-center justify-center shadow focus:outline-none z-10"
                                            onClick={() => {
                                                setImage(undefined);
                                                if (fileInputRef.current) fileInputRef.current.value = "";
                                            }}
                                            aria-label="Remove image"
                                        >
                                            ×
                                        </button>
                                        <img src={image} alt="Preview" className="rounded max-w-[80px] max-h-[80px] border" />
                                    </div>
                                    <span className="text-xs text-[var(--color-text-secondary)] mt-1 ml-1">Ready to send</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
