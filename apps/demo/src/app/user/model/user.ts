import { ConflictException } from '@nestjs/common';

import { AggregateRoot, EventHandler } from '@cqrx/core';
import { genSalt, hash } from 'bcrypt';

import { UserRegistered } from '../events';

export class User extends AggregateRoot {
  public isRegistered = false;
  public email!: string;
  public passwordHash!: string;

  @EventHandler(UserRegistered)
  public createUser(event: UserRegistered): void {
    this.isRegistered = true;
    this.email = event.data.email;
    this.passwordHash = event.data.passwordHash;
  }

  public async register(email: string, password: string): Promise<void> {
    if (this.isRegistered) throw new ConflictException();

    await this.apply(
      new UserRegistered({
        email,
        passwordHash: await hash(password, await genSalt()),
      })
    );
  }
}
