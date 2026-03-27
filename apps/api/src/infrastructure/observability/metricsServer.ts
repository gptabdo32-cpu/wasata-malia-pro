type MetricHandle = {
  labels: (..._labels: string[]) => {
    observe: (_value: number) => void;
    inc: (_value?: number) => void;
    set: (_value: number) => void;
  };
  inc: (_value?: number) => void;
  set: (_value: number) => void;
};

const makeMetric = (): MetricHandle => ({
  labels: () => ({ observe: () => undefined, inc: () => undefined, set: () => undefined }),
  inc: () => undefined,
  set: () => undefined,
});

export const httpRequestDuration = makeMetric();
export const eventHandlerLatency = makeMetric();
export const sagaTotalCounter = makeMetric();
export const sagaActiveGauge = makeMetric();

export function startMetricsServer() {
  return { started: true } as const;
}
