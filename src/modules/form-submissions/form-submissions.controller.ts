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
import type { FileMetadata, FormSchema } from '#app/types/forms';
import { FormSubmission } from '#app/types/forms';
import { RequestLoggerService } from '#app/services/request-logger/exports';
import { FORMS_STORAGE } from '#app/services/form-provider/mocked-forms-storage';
import { findComponents, isFileComponent } from '#app/modules/form-submissions/utils';
import { DataFactoryService } from '#app/services/data-factory/DataFactoryService';
import { InvalidCsvFileError } from '#app/services/data-factory/types/errors';

const ACCESS_TOKEN_NAME = 'X-Access-Token';

const VALIDATION_ERROR_CODE = 'VALIDATION_ERROR';

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
    protected readonly _logging: RequestLoggerService,
    protected readonly _dataFactoryService: DataFactoryService,
  ) {}

  protected _getSchema(accessToken: string, formKey: string): Promise<FormSchema> {
    if (!accessToken) {
      throw new UnauthorizedException(); // TODO: i18n
    }

    return this._provider.getForm(accessToken, formKey).catch((err) => {
      if (err instanceof InvalidTokenError) {
        this._logging.logger.error(`Wrong access token!`, {
          responseCode: 401,
        });
        throw new UnauthorizedException({
          traceId: this._logging.traceId,
          message: 'Wrong access token!', // TODO: i18n
        });
      }
      if (err instanceof FormNotFoundError) {
        this._logging.logger.error(`Schema [${formKey}] is not found!`, {
          responseCode: 404,
        });
        throw new NotFoundException({
          traceId: this._logging.traceId,
          message: 'Form is not found!', // TODO: i18n
        });
      }
      this._logging.logger.error(err?.message ?? 'Unknown error', {
        responseCode: 500,
      });
      throw new InternalServerErrorException({
        traceId: this._logging.traceId,
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
    examples: Object.fromEntries([...FORMS_STORAGE.keys()].map((key) => [key, { value: key }])),
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
    schema: {
      properties: {
        traceId: {
          type: 'string',
          example: '6bf6c1c1d713ec2f',
        },
        message: {
          type: 'string',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Помилка автентифікації (відсутній токен доступу)',
    schema: {
      properties: {
        traceId: {
          type: 'string',
          example: '6bf6c1c1d713ec2f',
        },
        message: {
          type: 'string',
        },
      },
    },
  })
  @ApiResponse({
    status: 422,
    description: 'Помилка валідації даних відносно схеми UI-форми',
    schema: {
      properties: {
        traceId: {
          type: 'string',
          example: '6bf6c1c1d713ec2f',
        },
        code: {
          type: 'string',
          example: VALIDATION_ERROR_CODE,
        },
        details: {
          type: 'object',
          properties: {
            errors: {
              type: 'array',
              items: {
                properties: {
                  value: {
                    type: 'string',
                    example: '"null"',
                  },
                  field: {
                    type: 'string',
                    example: 'entities',
                  },
                  message: {
                    type: 'string',
                    example: 'must not be null',
                  },
                },
              },
              example: [
                {
                  value: 'null',
                  field: 'entities',
                  message: 'must not be null',
                },
              ],
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Серверна помилка обробки запиту',
    schema: {
      properties: {
        traceId: {
          type: 'string',
          example: '6bf6c1c1d713ec2f',
        },
        message: {
          type: 'string',
        },
      },
    },
  })
  @Post(':formKey/validate')
  @HttpCode(200)
  public async validate(
    @Headers(ACCESS_TOKEN_NAME) accessToken: string,
    @Param('formKey') formKey: string,
    @Body() body: FormSchemaDTO,
  ): Promise<{ data: FormSubmission['data'] }> {
    this._logging.logger.info(`Loading schema [${formKey}]`);
    const schema = await this._getSchema(accessToken, formKey);

    try {
      this._logging.logger.info(`Validating against schema [${formKey}]`);
      const data = await this._validation.validate(schema, body);
      this._logging.logger.info(`Submission data for schema [${formKey}] seems to be valid ...`, {
        responseCode: 200,
      });

      const fileComponents = findComponents(
        schema.components,
        (component) => !!(isFileComponent(component.type) && component.resourceValidation),
      );

      const { processInstanceId, data: bodyFormData } = body;

      if (fileComponents && processInstanceId) {
        const results = fileComponents?.map(async (component) => {
          const bodyData = (bodyFormData[component.key] as unknown as FileMetadata[])[0];
          return await this._dataFactoryService.validationCsvFile({
            processInstanceId,
            accessToken,
            entity: component.resourceValidation as string,
            body: {
              id: bodyData.id,
              checksum: bodyData.checksum,
            },
          });
        });

        await Promise.all(results);
      }

      // TODO: normalize response format
      return {
        data,
      };
    } catch (err) {
      if (err instanceof InvalidCsvFileError) {
        this._logging.logger.error(`csv file is invalid`, {
          responseCode: 422,
        });

        throw new HttpException(JSON.parse(err.message), 422);
      }

      if (err instanceof FormValidationError) {
        this._logging.logger.error(`Submission for schema [${formKey}] is invalid!`, {
          responseCode: 422,
        });
        throw new HttpException(
          {
            traceId: this._logging.traceId,
            code: VALIDATION_ERROR_CODE,
            details: {
              errors: err.details.map((item) => ({
                value: JSON.stringify(item.context.value),
                field: item.context.key,
                message: item.message,
              })),
            },
          },
          422,
        );
      }

      this._logging.logger.error(`Unknown error while validating schema [${formKey}]`, {
        responseCode: 500,
      });
      throw new InternalServerErrorException({
        traceId: this._logging.traceId,
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
    examples: Object.fromEntries([...FORMS_STORAGE.keys()].map((key) => [key, { value: key }])),
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
    schema: {
      properties: {
        traceId: {
          type: 'string',
          example: '6bf6c1c1d713ec2f',
        },
        message: {
          type: 'string',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Схема UI-форми за вказаним {form-key} відсутня',
    schema: {
      properties: {
        traceId: {
          type: 'string',
          example: '6bf6c1c1d713ec2f',
        },
        message: {
          type: 'string',
        },
      },
    },
  })
  @ApiResponse({
    status: 422,
    description: 'Помилка валідації даних відносно схеми UI-форми',
    schema: {
      properties: {
        traceId: {
          type: 'string',
          example: '6bf6c1c1d713ec2f',
        },
        code: {
          type: 'string',
          example: VALIDATION_ERROR_CODE,
        },
        details: {
          type: 'object',
          properties: {
            errors: {
              type: 'array',
              items: {
                properties: {
                  field: {
                    type: 'string',
                    example: 'entities',
                  },
                  message: {
                    type: 'string',
                    example: 'must not be null',
                  },
                },
              },
              example: [
                {
                  field: 'entities',
                  message: 'must not be null',
                },
              ],
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Серверна помилка обробки запиту',
    schema: {
      properties: {
        traceId: {
          type: 'string',
          example: '6bf6c1c1d713ec2f',
        },
        message: {
          type: 'string',
        },
      },
    },
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
  ): Promise<{ isValid: boolean; message?: string }> {
    this._logging.logger.info(`Loading schema [${formKey}]`);
    const schema = await this._getSchema(accessToken, formKey);

    try {
      const result = this._validation.validateFileMeta(schema, fieldKey, body);
      if (result) {
        this._logging.logger.info(`File meta validation (schema [${formKey}])`, {
          responseCode: 200,
        });
        return {
          isValid: true,
        };
      } else {
        this._logging.logger.error(`Unknown error while validating schema [${formKey}]`, {
          responseCode: 500,
        });
        throw new InternalServerErrorException({
          traceId: this._logging.traceId,
          message: 'Unknown error while validating the form', // TODO: i18n
        });
      }
    } catch (err) {
      if (err instanceof FormFieldNotFoundError) {
        this._logging.logger.error(`Field [${fieldKey}] is not found in the schema [${formKey}]`, {
          responseCode: 404,
        });
        throw new NotFoundException({
          traceId: this._logging.traceId,
          message: err.message,
        });
      }
      if (
        err instanceof UnsupportedFileTypeError ||
        err instanceof UnsupportedSizeDefinition ||
        err instanceof FileMaxSizeError ||
        err instanceof MissingFormComponentError
      ) {
        this._logging.logger.error(`Field [${fieldKey}] submission data is not valid for the schema [${formKey}]`, {
          responseCode: 422,
        });
        throw new HttpException(
          {
            traceId: this._logging.traceId,
            code: VALIDATION_ERROR_CODE,
            details: {
              errors: [
                {
                  field: fieldKey,
                  message: err.message,
                },
              ],
            },
          },
          422,
        );
      }
      this._logging.logger.error(
        `Unknown error while validating the field [${fieldKey}] submission data against the schema [${formKey}]`,
        {
          responseCode: 500,
        },
      );
      throw new InternalServerErrorException({
        traceId: this._logging.traceId,
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
    examples: Object.fromEntries([...FORMS_STORAGE.keys()].map((key) => [key, { value: key }])),
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
        traceId: {
          type: 'string',
          example: '6bf6c1c1d713ec2f',
        },
        code: {
          type: 'string',
          example: VALIDATION_ERROR_CODE,
        },
        details: {
          type: 'object',
          properties: {
            errors: {
              type: 'array',
              items: {
                properties: {
                  field: {
                    type: 'string',
                    example: 'entities',
                  },
                  message: {
                    type: 'string',
                    example: 'must not be null',
                  },
                },
              },
              example: [
                {
                  field: 'entities',
                  message: 'must not be null',
                },
              ],
            },
          },
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
  ): Promise<{
    code?: number;
    fields: Record<string, boolean>;
    message?: string;
  }> {
    this._logging.logger.info(`Loading schema [${formKey}]`);
    const schema = await this._getSchema(accessToken, formKey);

    const checkedFields = this._validation.checkFieldsExistence(schema, body.fields ?? []);
    const badFields: string[] = [];

    checkedFields.forEach((value, field) => {
      if (!value) {
        badFields.push(field);
      }
    });
    if (badFields.length) {
      this._logging.logger.error(`Task form does not have fields with names: ${badFields.join(', ')}`, {
        responseCode: 422,
      });
      throw new HttpException(
        {
          traceId: this._logging.traceId,
          code: VALIDATION_ERROR_CODE,
          details: {
            errors: [...checkedFields.entries()]
              .filter(([, isExisting]) => !isExisting)
              .map(([field]) => ({ field, message: `Field "${field}" does not exist!` })),
          },
        },
        422,
      );
    } else {
      this._logging.logger.info(`Requested fields exist`, {
        responseCode: 200,
      });
      return {
        code: 200,
        fields: Object.fromEntries(checkedFields),
      };
    }
  }
}
