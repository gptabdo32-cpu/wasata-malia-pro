export class EscrowSaga {
  async start() { return { started: true } as const; }
}
