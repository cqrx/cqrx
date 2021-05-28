import { RecordedEvent } from 'node-eventstore-client';

import { Event } from '../event';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic Use
export type Transformer<T = any> = (
  event: Omit<RecordedEvent, 'data'> & { data: T }
) => Event;

export interface TransformerRepo {
  [aggregate: string]: Transformer;
}
