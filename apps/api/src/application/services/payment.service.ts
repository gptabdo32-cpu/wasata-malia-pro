import crypto from "node:crypto";

export type OrderStatus = "AWAITING_PAYMENT" | "PAID" | "CANCELLED";
export interface Order { id: string; amount: string; currency: string; status: OrderStatus; updatedAt: Date; }
export interface Payment { id: string; orderId: string; amount: string; currency: string; status: "SUCCESS" | "FAILED"; createdAt: Date; }

export class PaymentService {
  processPayment(order: Order): { order: Order; payment: Payment } {
    if (order.status !== "AWAITING_PAYMENT") throw new Error("Order is not ready for payment");
    const payment: Payment = { id: crypto.randomUUID(), orderId: order.id, amount: order.amount, currency: order.currency, status: "SUCCESS", createdAt: new Date() };
    return { order: { ...order, status: "PAID", updatedAt: new Date() }, payment };
  }
}
