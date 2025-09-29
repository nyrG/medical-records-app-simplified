import { IsString, MinLength } from 'class-validator';

export class SignInDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  pass: string;
}
