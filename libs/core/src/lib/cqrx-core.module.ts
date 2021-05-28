import {
  DynamicModule,
  Global,
  InternalServerErrorException,
  Module,
  OnModuleInit,
  Provider,
} from '@nestjs/common';
import { CqrsModule, EventBus } from '@nestjs/cqrs';

import { Config } from './contract/config';
import { EVENT_STORE_SETTINGS_TOKEN } from './contract/constant';
import { Event } from './event';
import { EventStore } from './event-store.service';
import {
  ConfigService,
  EventStoreModuleAsyncOptions,
} from './interfaces/options.interface';
import { TransformerService } from './transformer.service';

@Global()
@Module({
  imports: [CqrsModule],
  providers: [EventStore, TransformerService],
  exports: [EventStore],
})
export class CqrxCoreModule implements OnModuleInit {
  constructor(
    private readonly eventBus$: EventBus<Event>,
    private readonly eventStore: EventStore
  ) {}

  private static createAsyncProvider(
    options: EventStoreModuleAsyncOptions
  ): Provider {
    if ('useFactory' in options) {
      return {
        provide: EVENT_STORE_SETTINGS_TOKEN,
        ...options,
      };
    }

    return {
      provide: EVENT_STORE_SETTINGS_TOKEN,
      useFactory: async (optionsFactory: ConfigService) =>
        optionsFactory.createEventStoreConfig(),
      ...('useClass' in options
        ? { inject: [options.useClass], scope: options.scope }
        : { inject: [options.useExisting] }),
    };
  }

  public static forRoot(config: Config): DynamicModule {
    return {
      module: CqrxCoreModule,
      providers: [{ provide: EVENT_STORE_SETTINGS_TOKEN, useValue: config }],
      exports: [EventStore],
    };
  }

  public static forRootAsync(
    options: EventStoreModuleAsyncOptions
  ): DynamicModule {
    return {
      module: CqrxCoreModule,
      providers: [this.createAsyncProvider(options)],
    };
  }

  public async onModuleInit(): Promise<void> {
    if (!this.eventStore.client) {
      throw new InternalServerErrorException(
        'Could not connect to event stream...'
      );
    }

    await this.eventStore.client.subscribeToStream(
      '$streams',
      true,
      (_s, resolvedEvent) => {
        if (!resolvedEvent.isResolved) return;
        const event = this.eventStore.convertEvent(resolvedEvent);
        if (event) this.eventBus$.subject$.next(event);
      }
    );
  }
}
