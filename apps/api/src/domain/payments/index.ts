export interface IPaymentProvider { charge(amount: string): Promise<boolean>; }
export interface IPaymentRepository { save(payment: unknown): Promise<void>; }
export interface Wallet { id: number; userId: number; balance: string; }
export interface Payment { id: string; orderId: string; amount: string; currency: string; status: string; createdAt: Date; }
