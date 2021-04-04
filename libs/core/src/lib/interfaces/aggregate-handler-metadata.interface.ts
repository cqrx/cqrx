import { Type } from '@nestjs/common';

import { Event } from '../event';

export interface AggregateHandlerMetadata {
  event: Type<Event>;
  key: string | symbol;
}
