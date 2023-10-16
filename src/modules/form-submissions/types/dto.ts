import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FormFieldValidationInput } from '#app/services/form-validation/types';
import { FormSubmission } from '#app/types/forms';

export type FieldDataSchema = string | number | Record<string, unknown>;

export type FormDataSchema = Record<string, FieldDataSchema>;

export class FormSchemaDTO implements FormSubmission {
  @ApiProperty({
    type: 'object',
    example: {
      formField1: 'value1',
      formField2: 'value2',
    }
  })
  data: FormDataSchema;

  @ApiPropertyOptional({
    type: 'string',
    example: 'd5a40376-6360-11ee-88e8-0a580a81041b',
  })
  processInstanceId?: string;
}

export class FormFieldValidationDTO implements FormFieldValidationInput {
  @ApiProperty({
    type: 'string',
    example: 'file.csv',
  })
  public fileName: string;

  @ApiProperty({
    type: 'string',
    example: 'text/csv',
  })
  public contentType: string;

  @ApiProperty({
    type: 'number',
    example: 10,
  })
  public size: number;
}

export class FormFieldsCheckDTO {
  @ApiProperty({
    type: String,
    isArray: true,
    description: 'List of form fields for verification',
    example: [
      'name',
      'email',
    ]
  })
  public fields: string[];
}
