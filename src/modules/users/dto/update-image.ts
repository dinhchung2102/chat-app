import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateImageDto {
  @IsNotEmpty()
  @IsString()
  fileBuffer: Buffer;

  @IsNotEmpty()
  @IsString()
  originalname: string;
}
