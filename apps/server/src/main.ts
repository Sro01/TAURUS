import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaClientExceptionFilter } from './common/filters/prisma-client-exception.filter';
import { HttpAdapterHost } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')  // 쉼표로 구분된 여러 도메인
    : ['http://localhost:5173'];          // 로컬 개발 기본값

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // 공통 응답/에러 처리 적용
  app.useGlobalInterceptors(new TransformInterceptor());
  // PrismaExceptionFilter가 먼저 실행되어야 Prisma 에러를 잡아서 HttpException으로 변환 가능할 수도 있지만,
  // NestJS 필터 순서는 거꾸로 동작하지 않음 (선언 순서대로 바인딩).
  // 다만 BaseExceptionFilter를 상속받았으므로, 구체적인 에러를 잡는 필터를 먼저 등록하거나 순서를 조정.
  // 여기서는 HttpExceptionFilter가 모든 에러를 최종적으로 포맷팅하길 원한다면...
  // 하지만 PrismaFilter에서 response.json()을 직접 보내므로, 이걸 먼저 등록해서 처리하게 함.
  app.useGlobalFilters(new HttpExceptionFilter(), new PrismaClientExceptionFilter(app.get(HttpAdapterHost)));

  const config = new DocumentBuilder()
    .setTitle('Taurus API')
    .setDescription('Taurus 웹사이트 API 문서')
    .setVersion('1.0')
    .addTag('Auth', '인증 관련 API')
    .addTag('Team', '팀 관련 API')
    .addTag('Week', '주차 관련 API')
    .addTag('Reservation', '예약 관련 API')
    .addTag('Admin', '관리자 관련 API')
    // JWT 토큰 인증 설정
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'access-token', // @ApiBearerAuth('access-token')과 일치시켜야 함 (기본값은 default)
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
