import { FormSchema } from '#app/types/forms';

export abstract class BaseFormProviderService {
  public abstract getForm(token: string, formKey: string): Promise<FormSchema>;
}
