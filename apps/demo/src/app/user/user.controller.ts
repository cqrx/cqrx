import { Body, Controller, Get, Param, Post, Sse } from '@nestjs/common';
import { CommandBus, EventBus, QueryBus, ofType } from '@nestjs/cqrs';

import { Observable } from 'rxjs';

import { RegisterUser } from './command';
import { RegisterUserDto, UserDataDto, UserRegisteredDto } from './dto';
import { UserRegistered } from './events';
import { GetUser } from './query';

@Controller('user')
export class UserController {
  constructor(
    private readonly queryBus$: QueryBus,
    private readonly commandBus$: CommandBus,
    private readonly eventBus$: EventBus
  ) {}

  @Get(':email')
  public async getUser(@Param('email') email: string): Promise<UserDataDto> {
    return this.queryBus$.execute(new GetUser(email));
  }

  @Post('register')
  public async register(
    @Body() data: RegisterUserDto
  ): Promise<UserRegisteredDto> {
    return this.commandBus$.execute(new RegisterUser(data));
  }

  @Sse('registrations')
  public getRegistrations$(): Observable<{ data: UserRegisteredDto }> {
    return this.eventBus$.pipe(ofType(UserRegistered));
  }
}
