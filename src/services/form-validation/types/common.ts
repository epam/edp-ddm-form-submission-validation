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
  filename: string;
  contentType: string;
  size: number;
}
