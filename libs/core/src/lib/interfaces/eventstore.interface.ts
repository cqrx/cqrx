import { Observable } from 'rxjs';

import { Event } from '../event';

export interface IEventStore {
  readStreamFromStart: (
    streamId: string,
    resolveLinkTos?: boolean
  ) => AsyncGenerator<Event, void> | Generator<Event, void>;
  save: (event: IEventsToSave) => PromiseLike<void>;
}

export interface IEventsToSave {
  streamId: string;
  expectedVersion: number;
  events: Event[];
}

export type HandlerFunction<E extends Event = Event> = (
  event: E
) => Observable<void> | Promise<void> | void;
