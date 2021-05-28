import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { AggregateRepository, InjectAggregateRepository } from '@cqrx/core';

import { UserDataDto } from '../../dto';
import { User } from '../../model';
import { GetUser } from '../impl/get-user.query';

@QueryHandler(GetUser)
export class GetUserHandler implements IQueryHandler<GetUser, UserDataDto> {
  constructor(
    @InjectAggregateRepository(User)
    private readonly userRepository: AggregateRepository<User>
  ) {}

  public async execute(query: GetUser): Promise<UserDataDto> {
    const user = await this.userRepository.findOne(query.email);

    if (user.version === -1) {
      throw new NotFoundException();
    }

    return new UserDataDto(user.email);
  }
}
