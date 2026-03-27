export interface Escrow { id: number; buyerId: number; sellerId: number; amount: string; status: string; }
export interface IEscrowRepository { create(escrow: Partial<Escrow>): Promise<Escrow>; }
export interface IPaymentService { charge(amount: string): Promise<boolean>; }
export interface Inspection { id: number; escrowId: number; }
export interface Order { id: number; status: string; amount: string; currency: string; }
export interface Shipment { id: number; orderId: number; }
export function transitionOrder(status: string, next: string) { return next; }
