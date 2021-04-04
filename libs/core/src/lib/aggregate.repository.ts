import { Inject, Type } from '@nestjs/common';

import { AggregateRoot } from './aggregate-root';
import { EventStore } from './eventstore';
import { IEventStore } from './interfaces';

export class AggregateRepository<T extends AggregateRoot> {
  constructor(
    @Inject(EventStore) private readonly eventStore: IEventStore,
    private readonly Aggregate: Type<T>,
    private readonly category: string
  ) {}

  private create(id: string): T {
    return new this.Aggregate(this.category, id);
  }

  public async findOne(id: string): Promise<T> {
    const aggregate = this.create(id);

    for await (const event of this.eventStore.readStreamFromStart(
      `${this.category}-${id}`
    )) {
      await aggregate.apply(event, true);
    }

    return aggregate;
  }

  public async save(aggregate: T): Promise<void> {
    await this.eventStore.save(aggregate.getUncommittedEvents());
    await aggregate.commit();
  }
}
