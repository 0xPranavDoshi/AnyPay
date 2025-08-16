"use client";
import { useState } from "react";
import { usePayments } from "./usePayments";
import { Payment } from "@/lib/interface";

export default function Dashboard() {
 const [tab, setTab] = useState<"whoYouOwe" | "owedToYou">("whoYouOwe");
 // Hardcoded wallet address for demo; replace with actual user wallet from auth/session
 const walletAddress = "0x8d5470dd39ec0933a0ccaed0652e80ce891c4225";
 const { youOwe, owedToYou, loading, error } = usePayments(walletAddress);

	 function renderYouOwe(payments: Payment[]) {
		 if (loading) return <div className="text-center text-lg opacity-70">Loading...</div>;
		 if (error) return <div className="text-center text-lg text-red-500">{error}</div>;
		 // Flatten: For each payment where user is a sender, show recipient and amount owed
		 const rows: { recipient: Payment['recipient'], amount: number }[] = [];
		 payments.forEach(payment => {
			 payment.senders?.forEach(sender => {
				 if (sender.user.walletAddress === walletAddress) {
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
		 if (loading) return <div className="text-center text-lg opacity-70">Loading...</div>;
		 if (error) return <div className="text-center text-lg text-red-500">{error}</div>;
		 // Flatten: For each payment where user is recipient, show each sender and amount
		 const rows: { sender: { username: string; walletAddress: string }, amount: number }[] = [];
		 payments.forEach(payment => {
			 if (payment.recipient.walletAddress === walletAddress) {
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
				{/* Animated background elements (copied from landing for vibe consistency) */}
				<div className="absolute inset-0 pointer-events-none">
					{/* ...existing code... */}
				</div>
				 <div className="z-10 flex flex-col items-center justify-center h-full w-full gap-8 mt-12">
					 <h1 className="text-3xl font-bold mb-8">Hey testPerson</h1>
					 <div className="flex flex-row items-start justify-center w-full gap-8">
					 {/* Left Box with Tabs */}
					 <div className="bg-[var(--color-bg-secondary,rgba(255,255,255,0.05))] rounded-xl shadow-lg p-8 w-full max-w-md min-h-[400px] flex flex-col">
						 {/* Wallet address is hardcoded for now; remove input */}
						<div className="flex mb-4">
							<button
								className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ${
									tab === "whoYouOwe"
									? "bg-[var(--color-primary)] text-white"
									: "bg-transparent text-[var(--color-text-secondary)]"
								}`}
								onClick={() => setTab("whoYouOwe")}
							>
								Who You Owe
							</button>
							<button
								className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ml-2 ${
									tab === "owedToYou"
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
					 {/* Right Box */}
					 <div className="bg-[var(--color-bg-secondary,rgba(255,255,255,0.05))] rounded-xl shadow-lg p-8 w-full max-w-md min-h-[400px] flex flex-col">
						<h2 className="text-2xl font-semibold mb-4">Right Box</h2>
						{/* Add your right box content here */}
							 </div>
					 </div>
				 </div>
			</section>
		</div>
	);
}
