import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import type { Trace } from '#app/logging/types';
import { InvalidCsvFileError } from '#app/services/data-factory/types/errors';
import type { FileData } from '#app/services/form-validation/types';

@Injectable()
export class DataFactoryService {
  constructor(protected readonly _http: HttpService, protected readonly _configService: ConfigService) {}

  public async validationCsvFile({
    entity,
    processInstanceId,
    accessToken,
    body,
    trace,
  }: {
    accessToken: string;
    entity: string;
    processInstanceId: string;
    body: FileData;
    trace: Trace;
  }) {
    const response = await this._http.axiosRef
      .post(`${this._configService.get('DATA_FACTORY_BASE_URL')}/${entity}/csv/validation`, body, {
        headers: {
          ...trace.axiosHeaders,
          'X-Access-Token': accessToken,
          'X-Source-Business-Process-Instance-Id': processInstanceId,
        },
      })
      .catch((err) => {
        if (err instanceof AxiosError) {
          throw new InvalidCsvFileError(JSON.stringify(err.response?.data));
        }
        throw err;
      });

    return response;
  }
}
