import { IsEmail, IsString, Length } from 'class-validator';

export class RegisterUserDto {
  @IsEmail()
  public readonly email!: string;

  @IsString()
  @Length(6, 32)
  public readonly password!: string;
}
