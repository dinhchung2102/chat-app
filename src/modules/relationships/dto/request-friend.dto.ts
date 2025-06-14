import { IsNotEmpty, IsString } from 'class-validator';

export class RequestFriendDto {
  @IsNotEmpty()
  @IsString()
  targetAccountId: string;
}
