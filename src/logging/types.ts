import { createLogger, format, Logger, transports } from 'winston';
import { B3_HEADERS_LIST } from '#app/logging/constants';
import * as crypto from 'crypto';

export interface IRequestTraceData {
  'X-B3-TraceId': string;
  'X-B3-SpanId'?: string;
  'X-Request-Id'?: string;
}

export class Trace {
  protected readonly _logger: Logger;
  protected readonly _headers: Map<Lowercase<typeof B3_HEADERS_LIST[number]>, string> = new Map();

  constructor(trace: Readonly<IRequestTraceData>) {
    Object.entries(trace).forEach(([key, value]) => {
      this.setHeader(key, value);
    });
    this._fillHeaders();

    this._logger = createLogger({
      transports: [new transports.Console()],
      format: format.combine(
        format((info) => ({ ...this.trace, ...info }))(),
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

  public get logger(): Logger {
    return this._logger;
  }

  public get traceId(): string {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.getHeader('X-B3-TraceId')!;
  }

  public hasHeader(key: string): boolean {
    return this._headers.has(key.toLowerCase());
  }

  public getHeader(key: string): string | null {
    return this._headers.get(key.toLowerCase()) ?? null;
  }

  public setHeader(key: string, value?: string): void {
    if (value) {
      this._headers.set(key.toLowerCase(), value);
    } else {
      this._headers.delete(key.toLowerCase());
    }
  }

  public deleteHeader(key: string): void {
    this._headers.delete(key.toLowerCase());
  }

  protected _fillHeaders(): void {
    if (!this.hasHeader('X-B3-SpanId')) {
      this.setHeader('X-B3-SpanId', crypto.randomBytes(8).toString('hex'));
    }
    if (!this.hasHeader('X-Request-Id')) {
      this.setHeader('X-Request-Id', crypto.randomUUID());
    }
  }

  public get axiosHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    for (const [key, value] of this._headers.entries()) {
      headers[key] = value;
    }
    return headers;
  }

  public get trace(): IRequestTraceData {
    const trace: Record<string, string> = {};
    for (const header of B3_HEADERS_LIST) {
      if (this.hasHeader(header)) {
        trace[header] = <string>this.getHeader(header);
      }
    }
    return trace as unknown as IRequestTraceData;
  }
}
