export * from './aggregate-root';
export * from './aggregate.repository';
export * from './contract/config';
export * from './contract/constant';
export * from './cqrs-es.module';
export * from './decorators/event-handler.decorator';
export * from './decorators/inject-repository.decorator';
export * from './event';
export * from './eventstore';
export * from './interfaces/options.interface';
export * from './utils/test-aggregate.repository';

export { expectedVersion as ExpectedVersion } from 'node-eventstore-client';
