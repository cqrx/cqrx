import { FactoryProvider, Type } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';

import { AggregateRoot } from '../aggregate-root';
import { Event, EventRepo } from '../event';

import { getRepositoryToken } from './repository';

export class TestAggregateRepository<T extends AggregateRoot> {
  constructor(
    private readonly Aggregate: Type<T>,
    private readonly eventBus$: EventBus
  ) {
    this.category = Aggregate.name;
  }

  public static forAggregate<A extends AggregateRoot>(
    aggregate: Type<A>
  ): FactoryProvider {
    return {
      provide: getRepositoryToken(aggregate),
      useFactory: (eventBus$: EventBus) =>
        new TestAggregateRepository(aggregate, eventBus$),
      inject: [EventBus],
    };
  }

  private readonly events: EventRepo = {};
  private readonly category: string;

  public async findOne(id: string): Promise<T> {
    const aggregate = this.create(id);
    const events =
      this.events[aggregate.streamId] ?? (this.events[aggregate.streamId] = []);

    const applies = events.map(async (event) => aggregate.apply(event, true));
    await Promise.all(applies);

    return aggregate;
  }

  public async save(aggregate: T): Promise<void> {
    const events = aggregate.getUncommittedEvents();

    const currentEvents =
      this.events[aggregate.streamId] ?? (this.events[aggregate.streamId] = []);

    if (aggregate.version !== currentEvents.length - 1) {
      throw new Error('Concurrency exception');
    }

    currentEvents.push(...events);

    await aggregate.commit();
  }

  public getEventsFor(id: string): Event[] {
    return this.events[this.create(id).streamId] ?? [];
  }

  public create(id: string): T {
    const aggregate = new this.Aggregate(this.category, id);
    aggregate.publish = this.eventBus$.publish.bind(this.eventBus$);
    return aggregate;
  }
}
