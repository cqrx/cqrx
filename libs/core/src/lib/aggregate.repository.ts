import { Inject, Type } from '@nestjs/common';

import { AggregateRoot } from './aggregate-root';
import { EventStore } from './event-store.service';
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
    const { streamId } = aggregate;

    for await (const event of this.eventStore.readStreamFromStart(streamId)) {
      await aggregate.apply(event, true);
    }

    return aggregate;
  }

  public async save(aggregate: T): Promise<void> {
    await this.eventStore.save({
      streamId: aggregate.streamId,
      expectedVersion: aggregate.version,
      events: aggregate.getUncommittedEvents(),
    });
    await aggregate.commit();
  }
}
