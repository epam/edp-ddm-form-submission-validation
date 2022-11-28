import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpModule, HttpService } from '@nestjs/axios';
import { FormSubmissionsController } from '#app/modules/form-submissions/form-submissions.controller';
import { FORM_PROVIDER_AXIOS_KEY, FORM_PROVIDER_KEY } from '#app/modules/form-submissions/keys';
import {
  BaseFormProviderService,
  FormSchemaProviderService,
  MockedFormProviderService,
} from '#app/services/form-provider/exports';
import { FormValidationService } from '#app/services/form-validation/exports';
import axios from 'axios';
import type { EnvConfig } from '#app/types/env';
import { RequestLoggerService } from '#app/services/request-logger/exports';
import { DataFactoryService } from '#app/services/data-factory/DataFactoryService';

@Module({
  imports: [HttpModule],
  controllers: [FormSubmissionsController],
  providers: [
    RequestLoggerService,
    {
      provide: FORM_PROVIDER_AXIOS_KEY,
      useFactory: (config: ConfigService<EnvConfig>): HttpService => {
        return new HttpService(
          axios.create({
            baseURL: config.get('FORM_PROVIDER_BASE_URL', 'http://form-schema-provider:8080'),
          }),
        );
      },
      inject: [ConfigService],
    },
    {
      provide: FORM_PROVIDER_KEY,
      useFactory: (
        config: ConfigService<EnvConfig>,
        http: HttpService,
        logger: RequestLoggerService,
      ): BaseFormProviderService => {
        return config.get('USE_MOCKED_FORM_PROVIDER') === 'true'
          ? new MockedFormProviderService(logger)
          : new FormSchemaProviderService(config, http, logger);
      },
      inject: [ConfigService, FORM_PROVIDER_AXIOS_KEY, RequestLoggerService],
    },
    FormValidationService,
    DataFactoryService,
  ],
})
export class FormSubmissionsModule {}
