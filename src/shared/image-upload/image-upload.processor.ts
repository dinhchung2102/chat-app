import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CloudinaryService } from 'src/common/cloudinary/cloudinary.service';
import { User } from 'src/modules/users/schema/user.schema';
import { CloudinaryFolder } from 'src/common/dto/cloudinary-folder.dto';
import { EventsGateway } from '../events/events.gateway';

@Processor('image-upload')
export class ImageUploadProcessor extends WorkerHost {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    @InjectModel('User') private readonly userModel: Model<User>,

    private readonly eventsGateway: EventsGateway,
  ) {
    super();
  }

  override async process(job: Job): Promise<void> {
    const { name } = job;
    if (name === 'upload') {
      await this.handleUpload(job);
    }
  }

  private async handleUpload(job: Job): Promise<void> {
    const { userId, type, filename } = job.data as {
      userId: string;
      type: 'avatar' | 'background-image';
      filename: string;
    };

    // Tách path local & cloudinary:
    const localFolder = type === 'avatar' ? 'avatars' : 'background-images';
    const cloudinaryFolder =
      type === 'avatar'
        ? CloudinaryFolder.AVATARS
        : CloudinaryFolder.BACKGROUND_IMAGES;

    // Đường dẫn tới file local:
    const fullPath = path.join(process.cwd(), 'uploads', localFolder, filename);

    if (!fs.existsSync(fullPath)) {
      console.warn(`[ImageUploadProcessor] File not found: ${fullPath}`);
      return;
    }

    const buffer = fs.readFileSync(fullPath);

    // Upload lên đúng folder Cloudinary:
    const result = await this.cloudinaryService.uploadImage(
      buffer,
      filename,
      cloudinaryFolder,
    );

    const user = await this.userModel.findById(userId);
    if (!user) {
      console.warn(`[ImageUploadProcessor] User not found: ${userId}`);
      return;
    }

    if (type === 'avatar') user.avatar = result.secure_url;
    else user.backgroundImage = result.secure_url;

    await user.save();

    const uploadedFlag = fullPath + '.uploaded';
    fs.writeFileSync(uploadedFlag, ''); // Đánh dấu file đã xử lý
  }
}
