import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { InvalidCsvFileError } from '#app/services/data-factory/types/errors';
import type { FileData } from '#app/services/form-validation/types';
import { RequestLoggerService } from '#app/services/request-logger/request-logger.service';

@Injectable()
export class DataFactoryService {
  constructor(
    protected readonly _http: HttpService,
    protected readonly _configService: ConfigService,
    protected readonly _logging: RequestLoggerService,
  ) {}

  public async validationCsvFile({
    entity,
    processInstanceId,
    accessToken,
    body,
  }: {
    accessToken: string;
    entity: string;
    processInstanceId: string;
    body: FileData;
  }) {
    const response = await this._http.axiosRef
      .post(`${this._configService.get('DATA_FACTORY_BASE_URL')}/${entity}/csv/validation`, body, {
        headers: {
          ...this._logging.axiosHeaders,
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
