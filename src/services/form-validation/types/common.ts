export interface ValidationErrorDetailsItem {
  message: string;
  level: string;
  path: string[];
  context: {
    validator: string;
    setting: unknown;
    key: string;
    label: string;
    value: string;
  };
}

export interface FormFieldValidationInput {
  fileName: string;
  contentType: string;
  size: number;
}

export interface FileData {
  checksum: string;
  id: string;
}
