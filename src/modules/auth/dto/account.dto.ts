import { Types } from 'mongoose';
import { Exclude, Expose } from 'class-transformer';

export class AccountDto {
  @Expose()
  phone: string;

  @Exclude()
  password: string;

  @Expose()
  isActive: boolean;

  @Expose()
  roles: Types.ObjectId[];

  @Expose()
  user: Types.ObjectId;

  @Expose()
  createdAt?: Date;

  @Expose()
  updatedAt?: Date;

  constructor(partial: Partial<AccountDto>) {
    Object.assign(this, partial);
  }
}
