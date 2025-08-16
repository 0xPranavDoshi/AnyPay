export interface User {
  username: string;
  password: string;
  walletAddress: string;
}

export interface Payment {
  recipient: User;
  totalAmount: number;
  senders: {
    user: User;
    amount: number;
  }[];
}
