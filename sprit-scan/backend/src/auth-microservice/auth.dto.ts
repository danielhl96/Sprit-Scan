import { IsEmail, IsNotEmpty } from 'class-validator';

export class RegisterUserDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}

export class LoginUserDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}

export class DeleteUserDto {
  @IsNotEmpty()
  password: string;
}
