import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Role, RoleDocument } from './schema/role.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Role.name)
    private roleModel: Model<RoleDocument>,
  ) {}

  async createNewRole(dto: CreateRoleDto): Promise<RoleDocument> {
    try {
      const newRole = new this.roleModel({
        roleName: dto.roleName,
        description: dto.description,
        isActive: true,
      });

      return await newRole.save();
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.code === 11000) {
        throw new ConflictException({
          message: `roleName:${dto.roleName} đã tồn tại`,
          errorCode: 'ROLENAME_EXISTS',
        });
      }
      throw new BadRequestException(
        `Tạo role thất bại: ${(error as Error).message}`,
      );
    }
  }
}
