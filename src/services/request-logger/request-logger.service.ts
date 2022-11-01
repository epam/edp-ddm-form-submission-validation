import type { Request } from 'express';
import { REQUEST } from '@nestjs/core';
import { Inject, Injectable, Scope } from '@nestjs/common';
import { createLogger, format, Logger, transports } from 'winston';
import type { TraceHeaderKey } from '#app/services/request-logger/types';
import * as crypto from 'crypto';

@Injectable({ scope: Scope.REQUEST })
export class RequestLoggerService {
  protected readonly _logger: Logger;
  protected readonly _headers: Record<TraceHeaderKey, string> = {};

  constructor(@Inject(REQUEST) private readonly request: Request) {
    this._setupHeaders(request);

    this._logger = createLogger({
      transports: [new transports.Console()],
      format: format.combine(
        format((info) => ({ ...this._headers, ...info }))(),
        format.label(),
        format.timestamp({
          alias: '@timestamp',
        }),
        format((info) => {
          delete info['label'];
          delete info['timestamp'];
          return info;
        })(),
        format.json(),
      ),
    });
  }

  protected _setupHeaders(req: Request): void {
    ['X-B3-TraceId', 'X-B3-SpanId', 'X-Request-Id'].forEach((header: TraceHeaderKey) => {
      for (const [key, value] of Object.entries<string>(req.headers as Record<string, string>)) {
        if (key.toLowerCase() === header.toLowerCase()) {
          this._headers[header] = value;
        }
      }
    });
    if (!('X-B3-SpanId' in this._headers)) {
      this._headers['X-B3-SpanId'] = crypto.randomBytes(8).toString('hex');
    }
    if (!('X-Request-Id' in this._headers)) {
      this._headers['X-Request-Id'] = crypto.randomUUID();
    }
  }

  public get logger(): Logger {
    return this._logger;
  }

  public get axiosHeaders(): Record<string, string> {
    return this._headers; // TODO: check if headers should differ
  }

  public get traceId(): string {
    return this._headers['X-B3-TraceId'];
  }
}
