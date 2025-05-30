import { IsNotEmpty, IsString } from 'class-validator';
export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  roleName: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}
