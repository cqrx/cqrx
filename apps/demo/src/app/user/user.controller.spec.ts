import { ConflictException, NotFoundException } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';

import { TestAggregateRepository } from '@cqrx/core';

import { COMMAND_HANDLERS } from './command';
import { UserRegistered } from './events';
import { User } from './model';
import { QUERY_HANDLERS } from './query';
import { UserController } from './user.controller';

describe('UserController', () => {
  let controller: UserController;
  let repository: TestAggregateRepository<User>;

  beforeEach(async () => {
    const userRepositoryProvider = TestAggregateRepository.forAggregate<User>(
      User
    );

    const testingModule: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        ...COMMAND_HANDLERS,
        ...QUERY_HANDLERS,
        userRepositoryProvider,
      ],
      controllers: [UserController],
    }).compile();

    await testingModule.init();

    repository = testingModule.get(userRepositoryProvider.provide);
    controller = testingModule.get(UserController);
  });

  it('should register a user', async () => {
    await controller.register({
      email: 'test@example.com',
      password: '12345',
    });

    const events = repository.getEventsFor('test@example.com');

    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(UserRegistered);
  });

  it('should disallow repeat registrations', async () => {
    await controller.register({
      email: 'test@example.com',
      password: '12345',
    });
    await expect(
      controller.register({
        email: 'test@example.com',
        password: '12345',
      })
    ).rejects.toThrow(ConflictException);
  });

  it('should not find users that have not registered', async () => {
    const getUser = controller.getUser('unknown@email.com');
    await expect(getUser).rejects.toThrow(NotFoundException);
  });

  it('should find users after they are registered', async () => {
    await controller.register({
      email: 'test@example.com',
      password: '12345',
    });

    const user = await controller.getUser('test@example.com');

    expect(user.email).toBe('test@example.com');
  });

  it('should trigger registration subscriptions when users are registered', async (done) => {
    const subscription = controller.getRegistrations$().subscribe((data) => {
      expect(data.email).toBe('test@example.com');

      subscription.unsubscribe();
      done();
    });

    await controller.register({
      email: 'test@example.com',
      password: '12345',
    });
  });
});
