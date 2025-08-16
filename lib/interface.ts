export interface User {
  username: string;
  password: string;
  walletAddress: string;
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
}
