import { IsNotEmpty, IsString } from 'class-validator';

export class UnfriendDto {
  @IsNotEmpty()
  @IsString()
  friendAccountId: string;
}
