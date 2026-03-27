import crypto from "node:crypto";
export type OrderStatus = "AWAITING_SHIPMENT" | "SHIPPED" | "DELIVERED";
export interface Order { id: string; status: OrderStatus; updatedAt: Date; }
export interface Shipment { id: string; orderId: string; createdAt: Date; }

export class ShipmentService {
  processShipment(order: Order): { order: Order; shipment: Shipment } {
    if (order.status !== "AWAITING_SHIPMENT") throw new Error("Order is not ready for shipment");
    const shipment = { id: crypto.randomUUID(), orderId: order.id, createdAt: new Date() };
    return { order: { ...order, status: "SHIPPED", updatedAt: new Date() }, shipment };
  }
}
