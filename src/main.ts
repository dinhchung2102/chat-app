import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import * as cookieParser from 'cookie-parser';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SuccessResponseInterceptor } from './common/filters/success-response.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new SuccessResponseInterceptor());
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.use(cookieParser());
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));
  // main.ts
  app.enableCors({
    origin: ['http://localhost:5173, http://localhost:3000'],
    credentials: true,
  });

  if (process.env.NODE_ENV === 'development') {
    const config = new DocumentBuilder()
      .setTitle('Ứng dụng nhắn tin trực tuyến')
      .setDescription(
        'Ứng dụng được xây dựng nhằm mục đích học tập & rèn luyện kĩ năng \n \n' +
          'API được xây dựng bằng NestJS và sử dụng Mongodb làm cơ sở dữ liệu',
      )
      .setVersion('1.0')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
  }

  await app.listen(3000);
  if (process.env.NODE_ENV === 'development') {
    console.log(`App running at http://localhost:3000`);
  } else if (process.env.NODE_ENV === 'production') {
    console.log(`App running on production`);
  }
}
void bootstrap();
