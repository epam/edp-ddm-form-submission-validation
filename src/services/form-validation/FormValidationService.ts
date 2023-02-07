import './setup-env';
import { Injectable } from '@nestjs/common';
import { FormComponent, FormSchema, FormSubmission } from '#app/types/forms';
import { Formio } from 'formiojs';
import * as entities from 'html-entities';
import * as _ from 'lodash';
import {
  FileMaxSizeError,
  FormFieldValidationInput,
  FormValidationError,
  MissingFormComponentError,
  UnsupportedFileTypeError,
  UnsupportedSizeDefinition,
  ValidationErrorDetailsItem,
  FileData,
} from '#app/services/form-validation/types';
import localizationUA from '#app/i18n/validation/ua';
import { validateFilePattern } from '#app/services/form-validation/utils/mime';
import { FileSizeDefinition } from '#app/services/form-validation/types';
import type { DeepReadonly } from '#app/types/utils';
import { findComponents } from '#app/modules/form-submissions/utils';

@Injectable()
export class FormValidationService {
  public readonly language: string = 'ua';
  public readonly i18n: Readonly<Record<string, Record<string, string>>> = {
    ua: localizationUA,
  };

  public async validate(
    formSchemaInput: DeepReadonly<FormSchema>,
    submissionInput: DeepReadonly<FormSubmission>,
  ): Promise<FormSubmission['data']> {
    // TODO: include subforms logic
    // Copying values in order to avoid external data mutations
    const formSchema = _.cloneDeep<FormSchema>(formSchemaInput);
    const submission = _.cloneDeep<FormSubmission>(submissionInput);
    // TODO: evalContext
    // TODO: this.model and this.token

    const normalizedFormSchema = {
      ...formSchema,
      components: this.normalizeComponents(formSchema.components),
    };

    this.normalizeSubmission(normalizedFormSchema.components, submission);

    const unsets: Array<{
      key: string;
      data: unknown;
    }> = [];
    let unsetsEnabled = false;

    const isEmptyData = _.isEmpty(submission.data);

    const form = await Formio.createForm(normalizedFormSchema, {
      server: true,
      language: this.language,
      i18n: this.i18n,
      hooks: {
        setDataValue(this: any, value: never, key: string, data: never) {
          if (!unsetsEnabled) {
            return value;
          }
          // Check if this component is not persistent.
          if (
            Object.prototype.hasOwnProperty.call(this.component, 'persistent') &&
            (!this.component.persistent || this.component.persistent === 'client-only')
          ) {
            unsets.push({ key, data });
            // Check if this component is conditionally hidden and does not set clearOnHide to false.
          } else if (
            (!Object.prototype.hasOwnProperty.call(this.component, 'clearOnHide') || this.component.clearOnHide) &&
            (!this.conditionallyVisible() || !this.parentVisible)
          ) {
            // unsets.push({ key, data });
          } else if (this.component.type === 'password' && value === this.defaultValue) {
            unsets.push({ key, data });
          }
          return value;
        },
      },
    });

    // Set the validation config.
    form.validator.config = {
      // db: this.model, // TODO: might be needed in future
      // token: this.token, // TODO: might be needed in future
      form: normalizedFormSchema,
      submission,
    };

    // Set the submission data
    form.data = submission.data;

    // Perform calculations and conditions.
    form.calculateValue();
    form.checkConditions();

    // Reset the data
    form.data = {};

    // Set the value to the submission.
    unsetsEnabled = true;
    form.setValue(submission, {
      sanitize: true,
    });

    // Check the validity of the form.
    const isValid: boolean = await form.checkAsyncValidity(null, true);
    if (isValid) {
      // Clear the non-persistent fields.
      unsets.forEach((unset) => _.unset(unset.data, unset.key));
      submission.data = isEmptyData ? {} : form.data;
      // fix for memory leak
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (Formio as any).forms[form.id];
      return submission.data; // TODO: Check if we need another return data structure
    }

    const details: Array<ValidationErrorDetailsItem> = [];
    form.errors.forEach((error: { messages: ValidationErrorDetailsItem[] }) =>
      error.messages.forEach((message) => details.push({ ...message, message: entities.decode(message.message) })),
    );
    // fix for memory leak
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (Formio as any).forms[form.id];
    // Return the validation errors.
    throw new FormValidationError(details);
  }

  protected normalizeComponentType(type: string): string {
    // Remove 'Latest' and 'Legacy' parts of component types
    return type.replace(/(Latest|Legacy)$/g, '');
  }

  protected normalizeComponents(components: Array<FormComponent>): Array<FormComponent> {
    // Rename custom components, so they can be validated as default ones
    return components.map((component) => ({
      ...component,
      type: this.normalizeComponentType(component.type),
      ...(component.components ? { components: this.normalizeComponents(component.components) } : {}),
    }));
  }

  protected normalizeSubmission(components: Array<FormComponent>, submission: FormSubmission): void {
    if (!submission.data) {
      submission.data = {};
    }

    const data = submission.data;

    for (const key in data) {
      // TODO: check recursive
      // TODO: check if array
      const component = this._findComponentInComponents(components, key);
      if (data[key] && typeof data[key] === 'string') {
        if (component && ['day'].includes(component.type)) {
          data[key] = this.normalizeSubmissionDay(component, data[key] as string);
        }
      }

      if (component?.type === 'file') {
        data[key] = this.normalizeSubmissionFile(data[key] as FileData);
      }
    }
  }

  private normalizeSubmissionDay(component: FormComponent, data: string): string {
    if (data?.split('-').length === 3) {
      const [year, month, day] = data.split('-');
      return (component.dayFirst ? [day, month, year] : [month, day, year]).join('/');
    }
    return data;
  }

  private normalizeSubmissionFile(data: FileData): FileData | [] {
    const isArray = _.isArray(data) && data.length;
    const file = (isArray ? data : [data || {}]) as FileData[];
    const { checksum, id } = file[0];

    if (!checksum || !id) {
      return [];
    }

    return data;
  }

  public validateFileMeta(
    formSchemaInput: Readonly<FormSchema>,
    documentKey: string,
    fileMeta: FormFieldValidationInput,
  ): boolean {
    // Copying values in order to avoid external data mutations
    const formSchema = _.cloneDeep<FormSchema>(formSchemaInput); // TODO: clone later

    const fileComponent = this._findComponentInComponents(formSchema.components, documentKey);
    if (!fileComponent) {
      throw new MissingFormComponentError(documentKey);
    }

    let result = true;
    result &&= this._validateFileSize(fileComponent, fileMeta.size);
    result &&= this._validateFileType(fileComponent, fileMeta);

    return result;
  }

  public checkFieldsExistence(formSchemaInput: Readonly<FormSchema>, fields: string[]): Map<string, boolean> {
    const result: Map<string, boolean> = new Map();
    fields.forEach((field) => {
      if (!result.has(field)) {
        result.set(field, !!this._findComponentInComponents(formSchemaInput.components, field));
      }
    });
    return result;
  }

  protected _findComponentInComponents(
    components: FormComponent[],
    key: string,
  ): FormComponent | null {
    const foundComponents = findComponents(components, (component: FormComponent) => component.key === key);
    if (foundComponents?.length) {
      return foundComponents[0];
    }
    return null;
  }

  protected _validateFileSize(component: FormComponent, size: number): boolean {
    if (!component.fileMaxSize) {
      throw new UnsupportedSizeDefinition('', 'Missing file max size!'); // TODO: i18n
    }
    const fileMaxSizePattern: string = component.fileMaxSize;
    const fileSizeDefinition: string = this._getValidFileSizeDefinition(fileMaxSizePattern);
    const fileSize: number = this._getFileSizeBySizeDefinition(size, fileSizeDefinition);

    const fileMaxSize: number = +`${fileMaxSizePattern}`.replace(/\D/g, '');

    if (fileSize > fileMaxSize) {
      throw new FileMaxSizeError(fileMaxSizePattern);
    }
    return true;
  }

  protected _getValidFileSizeDefinition(fileMaxSizePattern: string): string {
    const fileSizeDefinition = fileMaxSizePattern.replace(/\d+/g, '');
    if (Object.values<string>(FileSizeDefinition).includes(fileSizeDefinition)) {
      return fileSizeDefinition;
    }
    throw new UnsupportedSizeDefinition(fileSizeDefinition);
  }

  protected _getFileSizeBySizeDefinition(size: number, fileSizeDefinition: string): number {
    if (fileSizeDefinition === 'MB') {
      // TODO: check KB?
      return size / (1024 * 1024);
    }
    throw new UnsupportedSizeDefinition(fileSizeDefinition);
  }

  protected _validateFileType(component: FormComponent, fileMeta: FormFieldValidationInput): boolean {
    const filePattern = component?.filePattern ?? '';
    const isAllowed: boolean = validateFilePattern(fileMeta, filePattern);
    if (isAllowed) {
      return isAllowed;
    }
    throw new UnsupportedFileTypeError(filePattern);
  }
}
