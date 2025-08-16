export interface User {
  username: string;
  password: string;
  walletAddress: string;
}

export enum TokenType {
  USDC = 0,
  CCIP_BNM = 1,
  CCIP_LNM = 2
}

export enum PaymentStatus {
  PENDING = "pending",
  PROCESSING = "processing", 
  COMPLETED = "completed",
  FAILED = "failed"
}

export interface CrossChainPayment {
  paymentId: string;
  fromUser: User;
  toUser: User;
  amount: number;
  sourceChain: string;
  destinationChain: string;
  destinationChainSelector: string;
  tokenType: TokenType;
  status: PaymentStatus;
  messageId?: string;
  txHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  recipients: {
    user: User;
    amount: number;
  }[];
  totalAmount: number;
  senders: {
    user: User;
    amount: number;
  }[];
  crossChainPayments?: CrossChainPayment[];
}
