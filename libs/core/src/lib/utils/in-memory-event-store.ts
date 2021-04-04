import { Event, EventRepo } from '../event';
import { ConcurrencyException } from '../exceptions/concurrency.exception';
import { IEventStore, IEventsToSave } from '../interfaces/eventstore.interface';

export class InMemoryEventStore implements IEventStore {
  private readonly events: Event[] = [];
  private readonly streams: EventRepo = {};

  public getPublishedEvents(): Event[] {
    return this.events;
  }

  public save(event: IEventsToSave): PromiseLike<void> {
    const current =
      this.streams[event.streamId] ?? (this.streams[event.streamId] = []);

    this.assertConcurrency(current.length - 1, event.expectedVersion);
    this.events.push(...event.events);
    current.push(...event.events);

    return Promise.resolve();
  }

  public assertConcurrency(version: number, expectedVersion: number): void {
    if (version !== expectedVersion) throw new ConcurrencyException();
  }

  public *readStreamFromStart(
    streamId: string,
    _resolveLinkTos?: boolean
  ): Generator<Event, void> {

    const events = this.streams[streamId] ?? (this.streams[streamId] = []);
    for (const event of events) {
      yield event;
    }
  }
}
