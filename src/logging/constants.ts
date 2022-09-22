import type { IRequestTraceData } from '#app/logging/types';

export const B3_HEADERS_LIST: ReadonlyArray<keyof IRequestTraceData | string> = [
  'X-B3-TraceId',
  'X-B3-SpanId',
  'X-Request-Id',
] as const;
