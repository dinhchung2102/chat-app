import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.listen(3000);
  if (process.env.NODE_ENV === 'development') {
    console.log(`App running at http://localhost:3000`);
  } else if (process.env.NODE_ENV === 'production') {
    console.log(`App running on production`);
  }
}
void bootstrap();
