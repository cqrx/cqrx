import { Event } from '@cqrx/core';

import { UserRegisteredDto } from '../dto';

export class UserRegistered extends Event<UserRegisteredDto> {}
