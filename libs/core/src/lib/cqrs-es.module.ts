import { DynamicModule, Module, Provider, Type } from '@nestjs/common';

import { AggregateRoot } from './aggregate-root';
import { AggregateRepository } from './aggregate.repository';
import { Config } from './contract/config';
import { EVENT_STORE_TRANSFORMERS_TOKEN } from './contract/constant';
import { EventStoreCoreModule } from './cqrs-es-core.module';
import { EventStore } from './eventstore';
import { EventStoreModuleAsyncOptions } from './interfaces/options.interface';
import { TransformerRepo } from './interfaces/transformer.type';
import { getRepositoryToken } from './utils/repository';


@Module({})
export class EventStoreModule {
  private static createAggregateRepositoryProviders(
    aggregateRoots: Array<Type<AggregateRoot>>
  ): Provider[] {
    return aggregateRoots.map((aggregateRoot) => ({
      provide: getRepositoryToken(aggregateRoot),
      useFactory: (eventStore) =>
        new AggregateRepository(eventStore, aggregateRoot, aggregateRoot.name),
      inject: [EventStore],
    }));
  }

  public static forRoot(options: Config): DynamicModule {
    return {
      module: EventStoreModule,
      imports: [EventStoreCoreModule.forRoot(options)],
    };
  }

  public static forRootAsync(
    config: EventStoreModuleAsyncOptions
  ): DynamicModule {
    return {
      module: EventStoreModule,
      imports: [EventStoreCoreModule.forRootAsync(config)],
    };
  }

  public static forFeature(
    aggregateRoots: Array<Type<AggregateRoot>>,
    transformers: TransformerRepo
  ): DynamicModule {
    const aggregateRepoProviders = this.createAggregateRepositoryProviders(aggregateRoots);
    return {
      module: EventStoreModule,
      providers: [
        ...aggregateRepoProviders,
        { provide: EVENT_STORE_TRANSFORMERS_TOKEN, useValue: transformers },
      ],
      exports: aggregateRepoProviders,
    };
  }
}
