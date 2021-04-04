import { Test } from '@nestjs/testing';

import { AggregateRoot } from './aggregate-root';
import { AggregateRepository } from './aggregate.repository';
import { EventHandler } from './decorators/event-handler.decorator';
import { InjectAggregateRepository } from './decorators/inject-repository.decorator';
import { Event } from './event';
import { EventStore } from './eventstore';
import { ConcurrencyException } from './exceptions/concurrency.exception';
import { InMemoryEventStore } from './utils/in-memory-event-store';
import { getRepositoryToken } from './utils/repository';

class SomethingHappened extends Event<{ id: string; what: string }> {}

class Something extends AggregateRoot {
  public happenings: string[] = [];

  @EventHandler(SomethingHappened)
  public createHappening(event: SomethingHappened): void {
    this.happenings.push(event.data.what);
  }

  public async doSomething(what: string): Promise<void> {
    await this.apply(new SomethingHappened({ id: this.streamId, what }));
  }
}

const createAggregateRepository = (
  eventStore = new InMemoryEventStore()
): AggregateRepository<Something> =>
  new AggregateRepository<Something>(eventStore, Something, 'Something');

class DependsOnAggregateRepository {
  constructor(
    @InjectAggregateRepository(Something)
    private readonly repository: AggregateRepository<Something>
  ) {}

  public async getSomething(): Promise<Something> {
    return this.repository.findOne('');
  }
}

describe('AggregateRepository', () => {
  it('loads events from history', async () => {
    const events = [
      new SomethingHappened({ id: '1', what: 'First thing' }),
      new SomethingHappened({ id: '1', what: 'Second thing' }),
    ];
    const eventStore = new InMemoryEventStore();
    await eventStore.save({
      streamId: 'Something-1',
      expectedVersion: -1,
      events,
    });

    const repository = createAggregateRepository(eventStore);

    const something = await repository.findOne('1');

    expect(something.happenings).toHaveLength(2);
    expect(something.happenings).toStrictEqual(['First thing', 'Second thing']);
  });

  it('saving uncommitted events', async () => {
    const eventStore = new InMemoryEventStore();
    const repository = createAggregateRepository(eventStore);
    const something = await repository.findOne('1');
    await something.doSomething('stuff');

    // does not apply uncommitted events
    expect(something.happenings).toStrictEqual([]);

    await repository.save(something);

    expect(eventStore.getPublishedEvents()).toHaveLength(1);
    expect(eventStore.getPublishedEvents()).toStrictEqual([
      expect.objectContaining({ data: { id: 'Something-1', what: 'stuff' } }),
    ]);
    expect(something.getUncommittedEvents().events).toHaveLength(0);
    expect(something.happenings).toStrictEqual(['stuff']);
  });

  it('optimistic concurrency', async () => {
    const repository = createAggregateRepository();
    const something = await repository.findOne('1');
    await something.doSomething('stuff');

    const sameSomething = await repository.findOne('1');
    await sameSomething.doSomething('stuff');

    await repository.save(something);
    await something.commit();

    await expect(repository.save(sameSomething)).rejects.toThrow(
      ConcurrencyException
    );

    await sameSomething.commit();
  });

  it(`it's injectable via @InjectAggregateRepository(Something)`, async () => {
    const moduleReference = await Test.createTestingModule({
      providers: [
        { provide: EventStore, useClass: InMemoryEventStore },
        {
          provide: getRepositoryToken(Something),
          useFactory: (eventStore: EventStore) =>
            new AggregateRepository(eventStore, Something, 'Something'),
          inject: [EventStore],
        },
        DependsOnAggregateRepository,
      ],
    }).compile();

    const dependent = moduleReference.get<DependsOnAggregateRepository>(
      DependsOnAggregateRepository
    );

    const something = await dependent.getSomething();

    expect(something).toBeDefined();
    expect(something).toBeInstanceOf(Something);
  });
});
