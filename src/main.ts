import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import * as cookieParser from 'cookie-parser';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SuccessResponseInterceptor } from './common/filters/success-response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new SuccessResponseInterceptor());
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.use(cookieParser());
  // main.ts
  app.enableCors({
    origin: ['http://localhost:5173'],
    credentials: true,
  });

  await app.listen(3000);
  if (process.env.NODE_ENV === 'development') {
    console.log(`App running at http://localhost:3000`);
  } else if (process.env.NODE_ENV === 'production') {
    console.log(`App running on production`);
  }
}
void bootstrap();
