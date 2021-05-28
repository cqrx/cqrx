import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import {
  EventData,
  EventStoreNodeConnection,
  ResolvedEvent,
  createConnection,
  createJsonEventData,
} from 'node-eventstore-client';

import { Config } from './contract/config';
import { EVENT_STORE_SETTINGS_TOKEN } from './contract/constant';
import { Event } from './event';
import { IEventStore, IEventsToSave } from './interfaces/eventstore.interface';
import { TransformerService } from './transformer.service';

@Injectable()
export class EventStore implements IEventStore {
  constructor(
    @Inject(EVENT_STORE_SETTINGS_TOKEN)
    private readonly settings: Config,
    private readonly transformers: TransformerService
  ) {
    this.connect();
  }

  public client: EventStoreNodeConnection | undefined;
  public isConnected = false;

  private connect(): void {
    this.client?.close();
    this.client = createConnection(
      this.settings.connection,
      this.settings.tcpEndpoint ??
        this.settings.gossipSeeds ??
        'tcp://127.0.0.1:1113'
    );
    this.attachHandlers();
    void this.client.connect();
  }

  private attachHandlers(): void {
    this.client?.on('connected', () => {
      this.isConnected = true;
    });

    this.client?.on('closed', () => {
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
    if (!this.client) {
      throw new InternalServerErrorException(
        'Could not connect to event stream...'
      );
    }

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
    if (!this.client) {
      throw new InternalServerErrorException(
        'Could not connect to event stream...'
      );
    }

    const increment = 1000;

    for (let current = 0; ; current += increment) {
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
    const transformer = this.transformers.repo[resolved.event.eventType];

    return transformer?.({
      ...resolved.event,
      data:
        resolved.event.isJson && resolved.event.data !== undefined
          ? JSON.parse(resolved.event.data.toString())
          : {},
    });
  }
}
