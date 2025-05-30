import { Types } from 'mongoose';
import { RoleDocument } from '../schema/role.schema';

export class RoleDto {
  readonly _id: string;
  readonly roleName: string;
  readonly description: string;
  readonly isActive: boolean;

  constructor(role: RoleDocument) {
    const id = role._id as Types.ObjectId;
    this._id = id.toString();
    this.roleName = role.roleName;
    this.description = role.description;
    this.isActive = role.isActive;
  }
}
