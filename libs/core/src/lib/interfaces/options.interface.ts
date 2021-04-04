import { ClassProvider, ExistingProvider, FactoryProvider } from '@nestjs/common';

import { Config } from '../contract/config';

export interface ConfigService {
  createEventStoreConfig: () => Config | Promise<Config>;
}

export type EventStoreModuleAsyncOptions = Omit<ClassProvider<Config>, 'provide'> | Omit<ExistingProvider<Config>, 'provide'> | Omit<FactoryProvider<Config>, 'provide'>;
