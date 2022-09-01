import { BaseFormProviderService } from './BaseFormProviderService';
import { Injectable } from '@nestjs/common';
import { FormSchema } from '#app/types/forms';
import { FormNotFoundError } from '#app/services/form-provider/types';
import { FORMS_STORAGE } from '#app/services/form-provider/mocked-forms-storage';

@Injectable()
export class MockedFormProviderService extends BaseFormProviderService {
  public async getForm(token: string, formKey: string): Promise<FormSchema> {
    /* istanbul ignore if */
    if (!FORMS_STORAGE.has(formKey)) {
      throw new FormNotFoundError('Form is not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return FORMS_STORAGE.get(formKey)!;
  }
}
