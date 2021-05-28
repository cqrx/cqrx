import { v4 } from 'uuid';

export class Event<P = unknown> {
  constructor(
    public readonly data: P,
    public readonly eventId = v4(),
    public readonly correlationId?: string,
    public readonly causationId?: string
  ) {
    this.eventType = Object.getPrototypeOf(this).constructor.name;
  }

  public readonly eventType: string;
}

export interface EventRepo {
  [key: string]: Event[] | undefined;
}
