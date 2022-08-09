import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseFormProviderService } from '#app/services/form-provider/classes/BaseFormProviderService';
import { FormSchema } from '#app/types/forms';
import { AxiosError } from 'axios';
import { FormNotFoundError, InvalidTokenError } from '#app/services/form-provider/types';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FormSchemaProviderService extends BaseFormProviderService {
  constructor(protected readonly _config: ConfigService, protected readonly _http: HttpService) {
    super();
  }

  public async getForm(token: string, formKey: string): Promise<FormSchema> {
    const response = await this._http.axiosRef
      .get(`/api/forms/${formKey}`, {
        headers: {
          'X-Access-Token': token,
        },
      })
      .catch((err) => {
        if (err instanceof AxiosError) {
          if (err.response?.status === 401) {
            throw new InvalidTokenError('Invalid token');
          }
          if (err.response?.status === 404) {
            throw new FormNotFoundError('Form is not found');
          }
        }
        throw err;
      });
    return response.data;
  }
}
