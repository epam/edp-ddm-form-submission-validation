import type { FormSchema } from '#app/types/forms';
import type { RequestLoggerService } from '#app/services/request-logger/exports';

export abstract class BaseFormProviderService {
  constructor(protected readonly logging: RequestLoggerService) {}

  public abstract getForm(token: string, formKey: string): Promise<FormSchema>;
}
