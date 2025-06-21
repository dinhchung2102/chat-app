import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './modules/auth';
import { UserModule } from './modules/users/user.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { RedisModule } from './shared/redis/redis.module';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { RelationshipsModule } from './modules/relationships/relationships.module';
import { EventsModule } from './shared/events/events.module';
import { ChatModule } from './modules/chat/chat.module';
import { BullModule } from '@nestjs/bullmq';
import { ImageUploadModule } from './shared/image-upload/image-upload.module';
import { ScheduleModule } from '@nestjs/schedule';
import { FileCleanupModule } from './shared/file-cleanup/file-cleanup.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI'),
      }),
    }),

    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: process.env.NODE_ENV === 'development' ? 9999 : 10,
        },
      ],
    }),

    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: 'smtp.gmail.com',
          port: parseInt(config.get<string>('EMAIL_PORT') || '587'),
          secure: false,
          auth: {
            user: config.get<string>('EMAIL_USER'),
            pass: config.get<string>('EMAIL_PASSWORD'),
          },
        },
        defaults: {
          from: `"No Reply" <${config.get<string>('EMAIL_USER')}>`,
        },
        preview: false,
        template: {
          dir: process.cwd() + '/src/shared/email/templates/',
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),

    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context }) => {
              const contextStr = context?.toString() || 'ChatApp';
              return `[${timestamp as string}] ${level} [${contextStr}] ${message as string}`;
            }),
          ),
        }),
        new winston.transports.File({
          filename: 'src/shared/logger/error.log',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    ScheduleModule.forRoot(),
    FileCleanupModule,
    ImageUploadModule,

    AuthModule,
    UserModule,
    RelationshipsModule,
    ChatModule,
    RedisModule,
    EventsModule,
  ],

  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
