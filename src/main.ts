import { AppModule } from '#app/app.module';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import { json } from 'body-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { EnvConfig } from '#app/types/env';

(async function bootstrap(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  const config: ConfigService<EnvConfig> = app.get(ConfigService);

  const port: number = +config.get('PORT', 8080);

  const apiGlobalPrefix = config.get('API_GLOBAL_PREFIX');
  if (apiGlobalPrefix) {
    app.setGlobalPrefix(apiGlobalPrefix);
  }

  if (config.get('SWAGGER_DISABLE') !== 'true') {
    const swaggerPath: string = config.get('SWAGGER_PATH', 'swagger-ui');
    const swaggerTitle: string = config.get('SWAGGER_TITLE', 'API');
    const swaggerDescription: string | undefined = config.get('SWAGGER_DESCRIPTION');

    const builder: DocumentBuilder = new DocumentBuilder().setTitle(swaggerTitle).setVersion('dev');
    if (swaggerDescription) {
      builder.setDescription(swaggerDescription);
    }

    console.log(`Setting up Swagger on path: ${swaggerPath}`);
    SwaggerModule.setup(swaggerPath, app, SwaggerModule.createDocument(app, builder.build(), {}));
  }

  if (
    ['true', '1'].includes(config.get('ENABLE_SHUTDOWN_HOOKS', 'false')) ||
    config.get('NODE_ENV') === 'development'
  ) {
    console.log('Setting up the shutdown hooks for the app instance ...');
    app.enableShutdownHooks();
  }

  app.use(json({ limit: config.get('REQUEST_BODY_LIMIT') || '10mb' }));

  await app.listen(port);
  return app;
})().then(async (app) => {
  const config: ConfigService<EnvConfig> = app.get(ConfigService);
  const env = config.get('NODE_ENV');
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Current environment is ` + (env ? `\`${env}\`` : env));
});
