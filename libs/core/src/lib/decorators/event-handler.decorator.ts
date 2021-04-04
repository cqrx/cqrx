import { Type } from '@nestjs/common';

import { AGGREGATE_ROOT_HANDLERS_KEY } from '../contract/constant';
import { Event } from '../event';
import { HandlerFunction } from '../interfaces';

export const EventHandler = <E extends Event>(event: Type<E>) => (
  target: object,
  key: string | symbol,
  descriptor: TypedPropertyDescriptor<HandlerFunction<E>>
) => {
  const handlers =
    Reflect.getMetadata(AGGREGATE_ROOT_HANDLERS_KEY, target) ?? [];

  Reflect.defineMetadata(
    AGGREGATE_ROOT_HANDLERS_KEY,
    [...handlers, { event, key }],
    target
  );
  return descriptor;
};
