import { Type, ValueProvider } from '@nestjs/common';

import { AggregateRoot } from '../aggregate-root';
import { Event, EventRepo } from '../event';

import { getRepositoryToken } from './repository';

export class TestAggregateRepository<T extends AggregateRoot> {
  constructor(private readonly Aggregate: Type<T>) {
    this.category = Aggregate.name;
  }

  public static forAggregate<A extends AggregateRoot>(
    aggregate: Type<A>
  ): ValueProvider {
    return {
      provide: getRepositoryToken(aggregate),
      useValue: new TestAggregateRepository<A>(aggregate),
    };
  }

  private readonly events: EventRepo = {};
  private readonly category: string;

  public async findOne(id: string): Promise<T> {
    const aggregate = this.create(id);
    const events =
      this.events[aggregate.streamId] ?? (this.events[aggregate.streamId] = []);

    for (const event of events) {
      aggregate.apply(event, true);
    }

    return Promise.resolve(aggregate);
  }

  public save(a: T): PromiseLike<void> {
    const eventsToSave = a.getUncommittedEvents();
    const currentEvents =
      this.events[eventsToSave.streamId] ??
      (this.events[eventsToSave.streamId] = []);

    if (eventsToSave.expectedVersion !== currentEvents.length - 1) {
      throw new Error('Concurrency exception');
    }

    currentEvents.push(...eventsToSave.events);

    a.commit();

    return Promise.resolve();
  }

  public getEventsFor(id: string): Event[] {
    return this.events[this.create(id).streamId] ?? [];
  }

  public create(id: string): T {
    return new this.Aggregate(this.category, id);
  }
}
