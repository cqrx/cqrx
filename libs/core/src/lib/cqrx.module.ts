import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { AggregateRoot } from './aggregate-root';
import { AggregateRepository } from './aggregate.repository';
import { Config } from './contract/config';
import { EVENT_STORE_TRANSFORMERS_TOKEN } from './contract/constant';
import { CqrxCoreModule } from './cqrx-core.module';
import { EventStore } from './event-store.service';
import { EventStoreModuleAsyncOptions } from './interfaces/options.interface';
import { TransformerRepo } from './interfaces/transformer.type';
import { getRepositoryToken } from './utils/repository';

@Module({})
export class CqrxModule {
  private static createAggregateRepositoryProviders(
    aggregateRoots: Array<Type<AggregateRoot>>
  ): Provider[] {
    return aggregateRoots.map((aggregateRoot) => ({
      provide: getRepositoryToken(aggregateRoot),
      useFactory: (eventStore: EventStore) =>
        new AggregateRepository(eventStore, aggregateRoot, aggregateRoot.name),
      inject: [EventStore],
    }));
  }

  public static forRoot(options: Config): DynamicModule {
    return {
      module: CqrxModule,
      imports: [CqrxCoreModule.forRoot(options)],
    };
  }

  public static forRootAsync(
    config: EventStoreModuleAsyncOptions
  ): DynamicModule {
    return {
      module: CqrxModule,
      imports: [CqrxCoreModule.forRootAsync(config)],
    };
  }

  public static forFeature(
    aggregateRoots: Array<Type<AggregateRoot>>,
    transformers: TransformerRepo
  ): DynamicModule {
    const aggregateRepoProviders =
      this.createAggregateRepositoryProviders(aggregateRoots);
    const transformersProvider = {
      provide: EVENT_STORE_TRANSFORMERS_TOKEN,
      useValue: transformers,
    } as const;

    return {
      module: CqrxModule,
      imports: [CqrsModule],
      providers: [...aggregateRepoProviders, transformersProvider],
      exports: [...aggregateRepoProviders, transformersProvider],
    };
  }
}
