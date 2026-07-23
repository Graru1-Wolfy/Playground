import type {
  Event,
  EventBus,
  EventHandler,
  EventMetadata,
  EventPayload,
  EventPriority,
  EventSubscription,
} from './types.js';

const PRIORITY_ORDER: Record<EventPriority, number> = {
  highest: 0,
  high: 1,
  normal: 2,
  low: 3,
  lowest: 4,
};

interface HandlerEntry {
  readonly id: string;
  readonly handler: EventHandler;
  readonly priority: EventPriority;
  readonly once: boolean;
}

function createEvent<T extends EventPayload>(
  metadata: EventMetadata,
  payload: T,
  source?: string,
): Event<T> {
  const event: Event<T> = {
    metadata,
    payload,
    timestamp: Date.now(),
    source,
    defaultPrevented: false,
    preventDefault() {
      if (metadata.cancellable) {
        event.defaultPrevented = true;
      }
    },
  };
  return event;
}

export class DefaultEventBus implements EventBus {
  private readonly events = new Map<string, EventMetadata>();
  private readonly handlers = new Map<string, HandlerEntry[]>();

  registerEvent(metadata: EventMetadata): void {
    this.events.set(metadata.name, metadata);
  }

  async emit<T extends EventPayload>(name: string, payload: T, source?: string): Promise<void> {
    const metadata = this.events.get(name);
    if (!metadata) {
      throw new Error(`Unknown event: ${name}`);
    }

    const event = createEvent(metadata, payload, source);
    const entries = [...(this.handlers.get(name) ?? [])].sort(
      (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
    );

    for (const entry of entries) {
      await entry.handler(event);
      if (event.defaultPrevented) break;
    }

    const remaining = (this.handlers.get(name) ?? []).filter((entry) => !entry.once || entries.indexOf(entry) === -1);
    this.handlers.set(name, remaining);
  }

  on<T extends EventPayload>(
    name: string,
    handler: EventHandler<T>,
    priority: EventPriority = 'normal',
  ): EventSubscription {
    const id = crypto.randomUUID();
    const entry: HandlerEntry = { id, handler: handler as EventHandler, priority, once: false };
    const list = this.handlers.get(name) ?? [];
    list.push(entry);
    this.handlers.set(name, list);
    return { id, unsubscribe: () => this.off({ id, unsubscribe: () => {} }) };
  }

  once<T extends EventPayload>(name: string, handler: EventHandler<T>): EventSubscription {
    const id = crypto.randomUUID();
    const entry: HandlerEntry = { id, handler: handler as EventHandler, priority: 'normal', once: true };
    const list = this.handlers.get(name) ?? [];
    list.push(entry);
    this.handlers.set(name, list);
    return { id, unsubscribe: () => this.off({ id, unsubscribe: () => {} }) };
  }

  off(subscription: EventSubscription): void {
    for (const [name, entries] of this.handlers) {
      const filtered = entries.filter((e) => e.id !== subscription.id);
      if (filtered.length !== entries.length) {
        this.handlers.set(name, filtered);
      }
    }
  }

  listEvents(): readonly EventMetadata[] {
    return [...this.events.values()];
  }
}
