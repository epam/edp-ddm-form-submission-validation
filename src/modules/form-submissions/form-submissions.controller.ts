import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpException,
  Inject,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { FormFieldsCheckDTO, FormFieldValidationDTO, FormSchemaDTO } from '#app/modules/form-submissions/types/dto';
import { ApiBody, ApiHeader, ApiParam, ApiResponse } from '@nestjs/swagger';
import { FORM_PROVIDER_KEY } from '#app/modules/form-submissions/keys';
import type { BaseFormProviderService } from '#app/services/form-provider/exports';
import { FormValidationService } from '#app/services/form-validation/FormValidationService';
import {
  FileMaxSizeError,
  FormFieldNotFoundError,
  FormValidationError,
  MissingFormComponentError,
  UnsupportedFileTypeError,
  UnsupportedSizeDefinition,
} from '#app/services/form-validation/types';
import { FormNotFoundError, InvalidTokenError } from '#app/services/form-provider/types';
import type { FormSchema } from '#app/types/forms';
import { FormSubmission } from '#app/types/forms';
import { RequestTrace } from '#app/logging/decorators';
import { Trace } from '#app/logging/types';

const ACCESS_TOKEN_NAME = 'X-Access-Token';

@ApiHeader({
  name: 'X-B3-TraceId',
  required: false,
})
@ApiHeader({
  name: 'X-B3-SpanId',
  required: false,
})
@ApiHeader({
  name: 'X-Request-Id',
  required: false,
})
@Controller('api/form-submissions')
export class FormSubmissionsController {
  constructor(
    @Inject(FORM_PROVIDER_KEY) protected readonly _provider: BaseFormProviderService,
    protected readonly _validation: FormValidationService,
  ) {}

  protected _getSchema(trace: Trace, accessToken: string, formKey: string): Promise<FormSchema> {
    if (!accessToken) {
      throw new UnauthorizedException(); // TODO: i18n
    }

    return this._provider.getForm(trace, accessToken, formKey).catch((err) => {
      if (err instanceof InvalidTokenError) {
        trace.logger.error(`Wrong access token!`, {
          responseCode: 401,
        });
        throw new UnauthorizedException({
          traceId: trace.traceId,
          message: 'Wrong access token!', // TODO: i18n
        });
      }
      if (err instanceof FormNotFoundError) {
        trace.logger.error(`Schema [${formKey}] is not found!`, {
          responseCode: 404,
        });
        throw new NotFoundException({
          traceId: trace.traceId,
          message: 'Form is not found!', // TODO: i18n
        });
      }
      trace.logger.error(err?.message ?? 'Unknown error', {
        responseCode: 500,
      });
      throw new InternalServerErrorException({
        traceId: trace.traceId,
        message: 'Unknown error while getting the form', // TODO: i18n
      });
    });
  }

  @ApiHeader({
    name: ACCESS_TOKEN_NAME,
    description: 'Токен доступу користувача',
    required: true,
  })
  @ApiParam({
    name: 'formKey',
    description: 'Унікальний ідентифікатор схеми UI-форми',
  })
  @ApiResponse({
    status: 200,
    description: 'OK',
  })
  @ApiResponse({
    status: 400,
    description: 'Некоректно сформований запит',
  })
  @ApiResponse({
    status: 401,
    description: 'Помилка автентифікації (відсутній токен доступу)',
  })
  @ApiResponse({
    status: 422,
    description: 'Помилка валідації даних відносно схеми UI-форми',
    schema: {
      properties: {
        name: {
          type: 'string',
          example: 'ValidationError',
        },
        details: {
          type: 'array',
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Серверна помилка обробки запиту',
  })
  @Post(':formKey/validate')
  @HttpCode(200)
  public async validate(
    @Headers(ACCESS_TOKEN_NAME) accessToken: string,
    @Param('formKey') formKey: string,
    @Body() body: FormSchemaDTO,
    @RequestTrace() trace: Trace,
  ): Promise<{ data: FormSubmission['data'] }> {
    trace.logger.info(`Loading schema [${formKey}]`);
    const schema = await this._getSchema(trace, accessToken, formKey);

    try {
      trace.logger.info(`Validating against schema [${formKey}]`);
      const data = await this._validation.validate(schema, body);
      trace.logger.info(`Submission data for schema [${formKey}] seems to be valid ...`, {
        responseCode: 200,
      });
      // TODO: normalize response format
      return {
        data,
      };
    } catch (err) {
      if (err instanceof FormValidationError) {
        trace.logger.error(`Submission for schema [${formKey}] is invalid!`, {
          responseCode: 422,
        });
        throw new HttpException(
          {
            traceId: trace.traceId,
            name: 'ValidationError',
            details: err.details,
          },
          422,
        );
      }

      trace.logger.error(`Unknown error while validating schema [${formKey}]`, {
        responseCode: 500,
      });
      throw new InternalServerErrorException({
        traceId: trace.traceId,
        message: 'Unknown validation error', // TODO: i18n
      });
    }
  }

  @ApiHeader({
    name: ACCESS_TOKEN_NAME,
    description: 'Токен доступу користувача',
    required: true,
  })
  @ApiParam({
    name: 'formKey',
    description: 'Унікальний ідентифікатор схеми UI-форми',
  })
  @ApiParam({
    name: 'fieldKey',
    description: 'Унікальний ідентифікатор поля в межах UI-форми',
  })
  @ApiBody({
    type: () => FormFieldValidationDTO,
  })
  @ApiResponse({
    status: 200,
    description: 'OK з поверненням результату',
    schema: {
      properties: {
        isValid: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Некоректно сформований запит',
  })
  @ApiResponse({
    status: 401,
    description: 'Помилка автентифікації (відсутній токен доступу)',
  })
  @ApiResponse({
    status: 404,
    description: 'Схема UI-форми за вказаним {form-key} відсутня',
  })
  @ApiResponse({
    status: 422,
    description: 'Помилка валідації даних відносно схеми UI-форми',
    schema: {
      properties: {
        isValid: {
          type: 'boolean',
          example: false,
        },
        message: {
          type: 'string',
        },
        code: {
          type: 'number',
          example: 422,
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Серверна помилка обробки запиту',
  })
  @ApiResponse({
    status: 501,
    description: 'Операція не підтримується системою',
  })
  @Post(':formKey/fields/:fieldKey/validate')
  @HttpCode(200)
  public async validateField(
    @Headers(ACCESS_TOKEN_NAME) accessToken: string,
    @Param('formKey') formKey: string,
    @Param('fieldKey') fieldKey: string,
    @Body() body: FormFieldValidationDTO,
    @RequestTrace() trace: Trace,
  ): Promise<{ isValid: boolean; message?: string }> {
    trace.logger.info(`Loading schema [${formKey}]`);
    const schema = await this._getSchema(trace, accessToken, formKey);

    try {
      const result = this._validation.validateFileMeta(schema, fieldKey, body);
      if (result) {
        trace.logger.info(`File meta validation (schema [${formKey}])`, {
          responseCode: 200,
        });
        return {
          isValid: true,
        };
      } else {
        trace.logger.error(`Unknown error while validating schema [${formKey}]`, {
          responseCode: 500,
        });
        throw new InternalServerErrorException({
          traceId: trace.traceId,
          message: 'Unknown error while validating the form', // TODO: i18n
        });
      }
    } catch (err) {
      if (err instanceof FormFieldNotFoundError) {
        trace.logger.error(`Field [${fieldKey}] is not found in the schema [${formKey}]`, {
          responseCode: 404,
        });
        throw new NotFoundException({
          traceId: trace.traceId,
          message: err.message,
        });
      }
      if (
        err instanceof UnsupportedFileTypeError ||
        err instanceof UnsupportedSizeDefinition ||
        err instanceof FileMaxSizeError ||
        err instanceof MissingFormComponentError
      ) {
        trace.logger.error(`Field [${fieldKey}] submission data is not valid for the schema [${formKey}]`, {
          responseCode: 422,
        });
        throw new HttpException(
          {
            traceId: trace.traceId,
            isValid: false,
            code: 422,
            message: err.message,
            // details: [],
          },
          422,
        );
      }
      trace.logger.error(
        `Unknown error while validating the field [${fieldKey}] submission data against the schema [${formKey}]`,
        {
          responseCode: 500,
        },
      );
      throw new InternalServerErrorException({
        traceId: trace.traceId,
        message: 'Unknown error while validating the form', // TODO: i18n
      });
    }
  }

  @ApiHeader({
    name: ACCESS_TOKEN_NAME,
    description: 'Токен доступу користувача',
    required: true,
  })
  @ApiParam({
    name: 'formKey',
    description: 'Унікальний ідентифікатор схеми UI-форми',
  })
  @ApiBody({
    type: () => FormFieldsCheckDTO,
  })
  @ApiResponse({
    status: 200,
    description: 'OK з поверненням результату',
    schema: {
      properties: {
        code: {
          type: 'number',
          example: 200,
        },
        fields: {
          type: 'object',
          example: {
            name: true,
            email: true,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 422,
    description: 'Помилка валідації даних відносно схеми UI-форми',
    schema: {
      properties: {
        code: {
          type: 'number',
          example: 422,
        },
        fields: {
          type: 'object',
          example: {
            name: true,
            email: false,
          },
        },
        message: {
          type: 'string',
        },
      },
    },
  })
  @Post(':formKey/fields/check')
  @HttpCode(200)
  public async checkFields(
    @Headers(ACCESS_TOKEN_NAME) accessToken: string,
    @Param('formKey') formKey: string,
    @Body() body: FormFieldsCheckDTO,
    @RequestTrace() trace: Trace,
  ): Promise<{
    code?: number;
    fields: Record<string, boolean>;
    message?: string;
  }> {
    trace.logger.info(`Loading schema [${formKey}]`);
    const schema = await this._getSchema(trace, accessToken, formKey);

    const checkedFields = this._validation.checkFieldsExistence(schema, body.fields ?? []);
    const badFields: string[] = [];

    checkedFields.forEach((value, field) => {
      if (!value) {
        badFields.push(field);
      }
    });
    if (badFields.length) {
      trace.logger.error(`Task form does not have fields with names: ${badFields.join(', ')}`, {
        responseCode: 422,
      });
      throw new HttpException(
        {
          traceId: trace.traceId,
          code: 422,
          message: `Task form does not have fields with names: ${badFields.join(', ')}`, // TODO: i18n
          fields: Object.fromEntries(checkedFields),
        },
        422,
      );
    } else {
      trace.logger.info(`Requested fields exist`, {
        responseCode: 200,
      });
      return {
        code: 200,
        fields: Object.fromEntries(checkedFields),
      };
    }
  }
}
