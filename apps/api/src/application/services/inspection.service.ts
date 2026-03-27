import crypto from "node:crypto";
export type OrderStatus = "UNDER_INSPECTION" | "APPROVED" | "REJECTED";
export interface Order { id: string; status: OrderStatus; updatedAt: Date; }
export interface Inspection { id: string; orderId: string; createdAt: Date; }

export class InspectionService {
  processInspection(order: Order): { order: Order; inspection: Inspection } {
    if (order.status !== "UNDER_INSPECTION") throw new Error("Order is not under inspection");
    const inspection = { id: crypto.randomUUID(), orderId: order.id, createdAt: new Date() };
    return { order: { ...order, status: "APPROVED", updatedAt: new Date() }, inspection };
  }
}
