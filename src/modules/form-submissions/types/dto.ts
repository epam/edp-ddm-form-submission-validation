import { ApiProperty } from '@nestjs/swagger';
import { FormFieldValidationInput } from '#app/services/form-validation/types';
import { FormSubmission } from '#app/types/forms';

export type FieldDataSchema = string | number | Record<string, unknown>;

export type FormDataSchema = Record<string, FieldDataSchema>;

export class FormSchemaDTO implements FormSubmission {
  @ApiProperty({
    type: 'object',
  })
  data: FormDataSchema;
}

export class FormFieldValidationDTO implements FormFieldValidationInput {
  @ApiProperty({
    type: 'string',
  })
  public fileName: string;

  @ApiProperty({
    type: 'string',
  })
  public contentType: string;

  @ApiProperty({
    type: 'number',
  })
  public size: number;
}

export class FormFieldsCheckDTO {
  @ApiProperty({
    type: String,
    isArray: true,
    description: 'Перелік полів форми для первірки',
  })
  public fields: string[];
}
