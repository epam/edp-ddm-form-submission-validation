import { supportedMimeTypes } from '#app/services/form-validation/utils/mime';
import { FileSizeDefinition } from './enums';
import type { ValidationErrorDetailsItem } from './common';

// TODO: consider i18n for messages

export class FormValidationError extends Error {
  constructor(public readonly details: ReadonlyArray<ValidationErrorDetailsItem>) {
    super();
  }
}

export class FormFieldNotFoundError extends Error {}

export class UnsupportedFileTypeError extends Error {
  constructor(public readonly filePattern: string, protected readonly _message?: string) {
    super(_message);
  }

  public get message(): string {
    return (
      this._message ??
      `The type of the downloaded file is not supported. Supported types are: ${this.supportedMimeTypes.join('; ')}.`
    );
  }

  public get supportedMimeTypes(): string[] {
    return supportedMimeTypes(this.filePattern);
  }
}

export class UnsupportedSizeDefinition extends Error {
  constructor(public readonly fileSizeDefinition: string, protected readonly _message?: string) {
    super(_message);
  }

  public get message(): string {
    return (
      this._message ??
      `The file size definition specified in the ui form is not supported (${
        this.fileSizeDefinition
      }). Supported file size definitions: [${Object.values(FileSizeDefinition).join(', ')}].`
    );
  }
}

export class FileMaxSizeError extends Error {
  constructor(public readonly fileMaxSizePattern: string, protected readonly _message?: string) {
    super(_message);
  }

  public get message(): string {
    return this._message ?? `The size of the downloaded file exceeds ${this.fileMaxSizePattern}`;
  }
}

export class MissingFormComponentError extends Error {
  constructor(public readonly fieldKey: string, protected readonly _message?: string) {
    super(_message);
  }

  public get message(): string {
    return this._message ?? `The field (${this.fieldKey}) is not found on the ui form`;
  }
}
