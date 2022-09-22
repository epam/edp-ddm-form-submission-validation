import type { FormSchema } from '#app/types/forms';
import type { Trace } from '#app/logging/types';

export abstract class BaseFormProviderService {
  public abstract getForm(trace: Trace, token: string, formKey: string): Promise<FormSchema>;
}
