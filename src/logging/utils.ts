import type { Request } from 'express';
import type { IRequestTraceData } from '#app/logging/types';
import { B3_HEADERS_LIST } from '#app/logging/constants';

export function headersToTraceData(headers: Request['headers']): IRequestTraceData {
  const entries = Object.entries(headers);
  const possible = B3_HEADERS_LIST.map((s) => s.toLowerCase());
  const newEntries: [string, string][] = entries.filter((entry): entry is [typeof B3_HEADERS_LIST[number], string] => {
    const [header, value] = entry;
    return typeof value === 'string' && possible.includes(header.toLowerCase());
  }) as [string, string][];
  return Object.fromEntries(newEntries) as unknown as IRequestTraceData;
}
