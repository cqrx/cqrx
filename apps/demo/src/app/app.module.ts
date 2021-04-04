import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { EventStoreModule } from '@cqrx/core';

import { UserModule } from './user/user.module';

@Module({
  imports: [
    CqrsModule,
    EventStoreModule.forRoot({
      connection: {
        defaultUserCredentials: { username: 'admin', password: 'changeit' },
      },
      tcpEndpoint: 'tcp://127.0.0.1:1113',
    }),
    UserModule,
  ],
})
export class AppModule {}
