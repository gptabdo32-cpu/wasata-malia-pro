export class AlertManager {
  static notify(message: string, context: Record<string, unknown> = {}) {
    console.warn(`[ALERT] ${message}`, context);
  }
}
