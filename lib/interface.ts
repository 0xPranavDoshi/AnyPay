export interface User {
  username: string;
  password: string;
  walletAddress: string;
}

export interface Payment {
  payer: User;
  totalAmount: number;
  owers: {
    user: User;
    amount: number;
  }[];
}
