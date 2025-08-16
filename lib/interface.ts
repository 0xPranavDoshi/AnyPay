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
