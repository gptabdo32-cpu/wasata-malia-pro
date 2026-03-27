export function emptyWallet(userId: number) {
  return {
    id: 0,
    userId,
    balance: "0.00",
    pendingBalance: "0.00",
    totalEarned: "0.00",
    totalWithdrawn: "0.00",
    updatedAt: new Date(),
  };
}
