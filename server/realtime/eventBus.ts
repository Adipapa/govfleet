export type FleetEvent = {
  type: 'telemetry.updated' | 'alert.created' | 'vehicle.updated';
  occurredAt: string;
  payload: Record<string, unknown>;
};

type Listener = (event: FleetEvent) => void;

const listeners = new Set<Listener>();

export function publishFleetEvent(event: FleetEvent): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch (error) {
      console.error('Fleet event listener failed', error);
    }
  }
}

export function subscribeFleetEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
