import { from } from 'rxjs';

import { AGGREGATE_ROOT_HANDLERS_KEY } from './contract/constant';
import { Event } from './event';
import { AggregateHandlerMetadata } from './interfaces';
import { HandlerFunction, IEventsToSave } from './interfaces/eventstore.interface';

const PENDING_EVENTS = Symbol('Pending Events');

export class AggregateRoot<E extends Event = Event> {
  constructor(streamName: string, id: string) {
    this.streamId = `${streamName}-${id}`;
  }

  private readonly [PENDING_EVENTS]: E[] = [];
  private version = -1;

  public readonly streamId: string;

  protected getEventHandlers(event: E): Array<HandlerFunction<E>> {
    const handlers = Reflect.getMetadata(
      AGGREGATE_ROOT_HANDLERS_KEY,
      Reflect.getPrototypeOf(this) ?? {}
    ) as AggregateHandlerMetadata[];

    return handlers
      .filter((handler) => event instanceof handler.event)
      .map(
        ({ key }) => (this[key as keyof this] as unknown) as HandlerFunction
      );
  }

  protected getEventName(event: Event): string {
    const { constructor } = Object.getPrototypeOf(event);
    return constructor.name as string;
  }

  public async apply<T extends E = E>(
    event: T,
    isFromHistory = false
  ): Promise<void> {
    if (isFromHistory) {
      const handlers = this.getEventHandlers(event);
      const calls = handlers.map(async (handler) => {
        const response$ = handler.call(this, event);

        if (response$) {
          await from(response$).toPromise();
        }
      });

      await Promise.all(calls);

      this.version += 1;
      return;
    }

    this[PENDING_EVENTS].push(event);
  }

  public async commit(): Promise<void> {
    const applies = this[PENDING_EVENTS].map(async (event) =>
      this.apply(event, true)
    );

    await Promise.all(applies);

    this[PENDING_EVENTS].length = 0;
  }

  public getUncommittedEvents(): IEventsToSave {
    return {
      streamId: this.streamId,
      expectedVersion: this.version,
      events: [...this[PENDING_EVENTS]],
    };
  }
}
