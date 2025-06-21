import { forwardRef, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ImageUploadProcessor } from './image-upload.processor';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from 'src/modules/users/schema/user.schema';
import { CloudinaryModule } from 'src/common/cloudinary/cloudinary.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'image-upload',
    }),
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
    forwardRef(() => CloudinaryModule),
    forwardRef(() => EventsModule),
  ],
  providers: [ImageUploadProcessor],
})
export class ImageUploadModule {}
