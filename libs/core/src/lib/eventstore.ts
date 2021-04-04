import { Inject, Injectable } from '@nestjs/common';

import {
  EventData,
  EventStoreNodeConnection,
  ResolvedEvent,
  createConnection,
  createJsonEventData,
} from 'node-eventstore-client';

import { Config } from './contract/config';
import { EVENT_STORE_SETTINGS_TOKEN, EVENT_STORE_TRANSFORMERS_TOKEN } from './contract/constant';
import { Event } from './event';
import { IEventStore, IEventsToSave } from './interfaces/eventstore.interface';
import { TransformerRepo } from './interfaces/transformer.type';

@Injectable()
export class EventStore implements IEventStore {
  constructor(
    @Inject(EVENT_STORE_SETTINGS_TOKEN)
    private readonly settings: Config,
    @Inject(EVENT_STORE_TRANSFORMERS_TOKEN)
    private readonly transformers: TransformerRepo
  ) {
    this.connect();
  }

  public client!: EventStoreNodeConnection;
  public isConnected = false;

  private connect(): void {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-confusing-void-expression -- T
    this.client?.close();
    this.client = createConnection(
      this.settings.connection,
      this.settings.tcpEndpoint ??
        this.settings.gossipSeeds ??
        'tcp://127.0.0.1:1113'
    );
    this.attachHandlers();
    this.client.connect();
  }

  private attachHandlers(): void {
    this.client.on('connected', () => {
      this.isConnected = true;
    });

    this.client.on('closed', () => {
      this.isConnected = false;
      this.connect();
    });
  }

  private createPayload(event: Event): EventData {
    const metadata =
      (event.correlationId ?? event.causationId) === undefined
        ? undefined
        : {
            $correlationId: event.correlationId,
            $causationId: event.causationId,
          };

    return createJsonEventData(
      event.eventId,
      event.data,
      metadata,
      event.eventType
    );
  }

  public async save({
    events,
    expectedVersion,
    streamId,
  }: IEventsToSave): Promise<void> {
    if (events.length === 0) return;

    await this.client.appendToStream(
      streamId,
      expectedVersion,
      events.map((event) => this.createPayload(event))
    );
  }

  public async *readStreamFromStart(
    streamId: string,
    resolveLinkTos = false
  ): AsyncGenerator<Event, void> {
    const increment = 1000;

    for (let current = 0; ; current += increment) {
      // eslint-disable-next-line no-await-in-loop -- Slices are paginated and we want to maintain order consistency.
      const slice = await this.client.readStreamEventsForward(
        streamId,
        current,
        increment,
        resolveLinkTos
      );

      for (const recordedEvent of slice.events) {
        const event = this.convertEvent(recordedEvent);
        if (event) {
          yield event;
        }
      }

      if (slice.isEndOfStream) return;
    }
  }

  public convertEvent(resolved: ResolvedEvent): Event | undefined {
    if (resolved.event === undefined) return undefined;
    const transformer = this.transformers[resolved.event.eventType];

    return transformer?.({
      ...resolved.event,
      data:
        resolved.event.isJson && resolved.event.data !== undefined
          ? JSON.parse(resolved.event.data.toString())
          : {},
    });
  }
}
