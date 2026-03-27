export class PaymentSaga {
  async start() { return { started: true } as const; }
}
