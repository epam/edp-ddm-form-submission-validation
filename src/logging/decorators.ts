import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Trace } from '#app/logging/types';
import { headersToTraceData } from '#app/logging/utils';

export const RequestTrace = createParamDecorator((data: never, ctx: ExecutionContext): Trace => {
  const request = ctx.switchToHttp().getRequest();
  const trace = headersToTraceData(request.headers);
  return new Trace(trace);
});
