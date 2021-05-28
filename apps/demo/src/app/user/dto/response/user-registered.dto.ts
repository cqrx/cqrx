export class UserRegisteredDto {
  constructor(
    public readonly email: string,
    public readonly passwordHash: string
  ) {}
}
