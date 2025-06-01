import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^(0|\+84)[0-9]{9}$/, { message: 'Số điện thoại không hợp lệ' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
