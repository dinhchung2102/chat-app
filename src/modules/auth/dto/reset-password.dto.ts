import { IsEmail, IsString } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  authOTP: string;

  @IsString()
  newPassword: string;
}
