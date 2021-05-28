import { from } from 'rxjs';

import { AGGREGATE_ROOT_HANDLERS_KEY } from './contract/constant';
import { Event } from './event';
import { AggregateHandlerMetadata } from './interfaces';
import { HandlerFunction } from './interfaces/eventstore.interface';

const INTERNAL_EVENTS = Symbol('Internal Events');
const VERSION = Symbol('Version');

export class AggregateRoot<E extends Event = Event> {
  constructor(streamName: string, id: string) {
    this.streamId = `${streamName}-${id}`;
  }

  private readonly [INTERNAL_EVENTS]: E[] = [];
  private [VERSION] = -1;

  public get version(): number {
    return this[VERSION];
  }

  public readonly streamId: string;

  protected getEventHandlers(event: E): Array<HandlerFunction<E>> {
    const handlers = Reflect.getMetadata(
      AGGREGATE_ROOT_HANDLERS_KEY,
      Reflect.getPrototypeOf(this) ?? {}
    ) as AggregateHandlerMetadata[];

    return handlers
      .filter((handler) => event instanceof handler.event)
      .map(
        ({ key }) => this[key as keyof this] as unknown as HandlerFunction<E>
      );
  }

  protected getEventName(event: Event): string {
    const { constructor } = Object.getPrototypeOf(event);
    return constructor.name as string;
  }

  protected getEventHandler<T extends E = E>(_event: T): Function | undefined {
    throw new Error('Method not implemented.');
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

      this[VERSION] += 1;
      return;
    }

    this[INTERNAL_EVENTS].push(event);
  }

  public async commit(): Promise<void> {
    const applies = this[INTERNAL_EVENTS].map(async (event) => {
      await this.apply(event, true);
      this.publish(event);
    });

    await Promise.all(applies);

    this[INTERNAL_EVENTS].length = 0;
  }

  public getUncommittedEvents(): E[] {
    return [...this[INTERNAL_EVENTS]];
  }

  public publish<T extends E = E>(_event: T): void {}

  public uncommit(): void {
    throw new Error('Method not implemented.');
  }

  public loadFromHistory(_history: E[]): void {
    throw new Error('Method not implemented.');
  }
}
