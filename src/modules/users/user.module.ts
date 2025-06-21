import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schema/user.schema';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AuthModule } from '../auth';
import { CloudinaryModule } from 'src/common/cloudinary/cloudinary.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => AuthModule),
    forwardRef(() => CloudinaryModule),
    BullModule.registerQueue({
      name: 'image-upload',
    }),
  ],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService, MongooseModule],
})
export class UserModule {}
