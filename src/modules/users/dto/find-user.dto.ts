import { IsNotEmpty, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class FindUserDto extends PaginationDto {
  @IsNotEmpty()
  @IsString()
  keyword: string;
}
