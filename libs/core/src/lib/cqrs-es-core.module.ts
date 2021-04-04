import {
  DynamicModule,
  Global,
  Module,
  OnModuleInit,
  Provider,
} from '@nestjs/common';
import { CqrsModule, EventBus } from '@nestjs/cqrs';

import { Config } from './contract/config';
import { EVENT_STORE_SETTINGS_TOKEN } from './contract/constant';
import { Event } from './event';
import { EventStore } from './eventstore';
import {
  ConfigService,
  EventStoreModuleAsyncOptions,
} from './interfaces/options.interface';

@Global()
@Module({
  imports: [CqrsModule],
})
export class EventStoreCoreModule implements OnModuleInit {
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
        ...options
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
      module: EventStoreCoreModule,
      providers: [
        EventStore,
        { provide: EVENT_STORE_SETTINGS_TOKEN, useValue: config },
      ],
      exports: [EventStore],
    };
  }

  public static forRootAsync(
    options: EventStoreModuleAsyncOptions
  ): DynamicModule {
    return {
      module: EventStoreCoreModule,
      providers: [EventStore, this.createAsyncProvider(options)],
      exports: [EventStore],
    };
  }

  public async onModuleInit(): Promise<void> {
    await this.eventStore.client.subscribeToAll(true, (_s, resolvedEvent) => {
      const event = this.eventStore.convertEvent(resolvedEvent);
      if (event) this.eventBus$.subject$.next(event);
    });
  }
}
