import { FormValidationError, FormValidationService } from '#app/services/form-validation/exports';
import { BaseFormProviderService, MockedFormProviderService } from '#app/services/form-provider/exports';
import type { FormSchema, FormSubmission } from '#app/types/forms';
import { RequestLoggerService } from '#app/services/request-logger/exports';
import type { Request } from 'express';

async function _formatValidatePromiseResult(p: Promise<unknown>): Promise<unknown> {
  return p
    .then((data) => ({ data }))
    .catch((err) => {
      if (err instanceof FormValidationError) {
        return {
          name: 'ValidationError',
          details: err.details,
        };
      }
      throw err;
    });
}

describe('FormValidationService', () => {
  let $formValidation: FormValidationService;
  let $formProvider: BaseFormProviderService;
  const token = 'abcd';

  beforeEach(async () => {
    const req = {
      headers: {
        'X-B3-TraceId': 'testtrace0',
      },
    } as unknown as Request;
    const $logger = new RequestLoggerService(req);
    $formValidation = new FormValidationService();
    $formProvider = new MockedFormProviderService($logger);
  });

  describe('Form submission validation', () => {
    describe('edit-personprofile-firstbpmn', () => {
      let formSchema: FormSchema;
      beforeEach(async () => {
        const key = 'edit-personprofile-firstbpmn';
        formSchema = await $formProvider.getForm(token, key);
      });

      it('empty submission', async () => {
        try {
          await _formatValidatePromiseResult($formValidation.validate(formSchema, {} as FormSubmission));
        } catch (err) {
          expect((err as Error).message).toEqual('No data in submission!');
        }
      });

      it('empty data', async () => {
        const received = await _formatValidatePromiseResult(
          $formValidation.validate(formSchema, {
            data: {},
          }),
        );
        expect(received).toEqual({
          data: {},
        });
      });

      it('empty with meta', async () => {
        const received = await _formatValidatePromiseResult(
          $formValidation.validate(formSchema, {
            _id: '62a30efb91d5167a4ceee5a3',
            data: {},
            name: 'abc',
            title: 'abc',
            path: 'abc',
          } as FormSubmission),
        );
        expect(received).toEqual({
          data: {},
        });
      });

      it('lastName', async () => {
        const received = await _formatValidatePromiseResult(
          $formValidation.validate(formSchema, {
            data: {
              lastName: 'def',
            },
          }),
        );
        expect(received).toEqual({
          data: {
            lastName: 'def',
            first_name: '',
            birthday: '',
          },
        });
      });

      it('numeric', async () => {
        const received = await _formatValidatePromiseResult(
          $formValidation.validate(formSchema, {
            data: {
              lastName: 111,
              last_name: 222,
              firstName: '333',
              first_name: '444',
            },
          }),
        );

        expect(received).toEqual({
          data: {
            lastName: 111,
            first_name: '444',
            birthday: '',
          },
        });
      });
    });

    describe('user', () => {
      let formSchema: FormSchema;
      beforeEach(async () => {
        const key = 'user';
        formSchema = await $formProvider.getForm(token, key);
      });

      it('password', async () => {
        const received = await _formatValidatePromiseResult(
          $formValidation.validate(formSchema, {
            data: {
              email: 'user@example.com',
              password: 'abcd1234',
            },
          }),
        );
        expect(received).toEqual({
          data: {
            email: 'user@example.com',
            password: 'abcd1234',
          },
        });
      });
    });

    describe('test-password', () => {
      let formSchema: FormSchema;
      beforeEach(async () => {
        const key = 'test-password';
        formSchema = await $formProvider.getForm(token, key);
      });

      it('passwords', async () => {
        const received = await _formatValidatePromiseResult(
          $formValidation.validate(formSchema, {
            data: {
              email: 'user@example.com',
              'email-not-persistent': 'admin@example.com',
              password: 'abcd1234',
              'password-not-persistent': 'ab12cd34',
              'password-default-value': 'pass',
            },
          }),
        );
        expect(received).toEqual({
          data: {
            email: 'user@example.com',
            password: 'abcd1234',
          },
        });
      });

      it('password with default value', async () => {
        const received = await _formatValidatePromiseResult(
          $formValidation.validate(formSchema, {
            data: {
              'password-default-value': 'pass2',
            },
          }),
        );
        expect(received).toEqual({
          data: {
            email: '',
            'password-default-value': 'pass2',
          },
        });
      });
    });

    describe('mdtuddm-12887', () => {
      let formSchema: FormSchema;
      beforeEach(async () => {
        const key = 'mdtuddm-12887';
        formSchema = await $formProvider.getForm(token, key);
      });

      it('empty', async () => {
        const received = await _formatValidatePromiseResult(
          $formValidation.validate(formSchema, {
            data: {},
          }),
        );

        expect(received).toEqual({
          data: {},
        });
      });

      it('selectLatest2', async () => {
        const received = await _formatValidatePromiseResult(
          $formValidation.validate(formSchema, {
            data: {
              selectLatest2: 'selected',
            },
          }),
        );

        expect(received).toEqual({
          data: {
            selectLatest: {},
            selectLatest1: {},
            selectLatest2: 'selected',
            selectLatest3: '',
            selectLatest4: '',
            selectLatest5: '',
            selectLatest6: '',
          },
        });
      });
    });

    describe('mdtuddm-11573', () => {
      let formSchema: FormSchema;
      beforeEach(async () => {
        const key = 'mdtuddm-11573';
        formSchema = await $formProvider.getForm(token, key);
      });

      it('empty', async () => {
        const received = await _formatValidatePromiseResult(
          $formValidation.validate(formSchema, {
            data: {},
          }),
        );

        expect(received).toEqual({
          data: {},
        });
      });

      it('abc', async () => {
        const received = await _formatValidatePromiseResult(
          $formValidation.validate(formSchema, {
            data: {
              abc: 123,
            },
          }),
        );

        expect(received).toEqual({
          data: {
            editgridLatest1: [
              {
                textfieldLatest: 'test1',
                textfieldLatest1: 'test2',
              },
            ],
            editgridLatest: [],
            editgrid: [
              {
                'textfield3-1': 'test3-1',
                'textfield3-2': 'test3-2',
              },
            ],
          },
        });
      });

      it('test3', async () => {
        const received = await _formatValidatePromiseResult(
          $formValidation.validate(formSchema, {
            data: {
              'textfield3-1': 33344,
              textfieldLatest1: 'textfieldLatest1',
            },
          }),
        );

        expect(received).toEqual({
          data: {
            editgridLatest1: [
              {
                textfieldLatest: 'test1',
                textfieldLatest1: 'test2',
              },
            ],
            editgridLatest: [],
            editgrid: [
              {
                'textfield3-1': 'test3-1',
                'textfield3-2': 'test3-2',
              },
            ],
          },
        });
      });

      it('test4', async () => {
        const received = await _formatValidatePromiseResult(
          $formValidation.validate(formSchema, {
            data: {
              'textfield3-1': { xyz: 1000 },
              textfieldLatest1: ['wtf'],
            },
          }),
        );

        expect(received).toEqual({
          data: {
            editgridLatest1: [
              {
                textfieldLatest: 'test1',
                textfieldLatest1: 'test2',
              },
            ],
            editgridLatest: [],
            editgrid: [
              {
                'textfield3-1': 'test3-1',
                'textfield3-2': 'test3-2',
              },
            ],
          },
        });
      });
    });

    describe('mdtuddm-16614-complex-validation', () => {
      let formSchema: FormSchema;
      beforeEach(async () => {
        const key = 'mdtuddm-16614-complex-validation';
        formSchema = await $formProvider.getForm(token, key);
      });

      it('empty', async () => {
        const received = await _formatValidatePromiseResult(
          $formValidation.validate(formSchema, {
            data: {},
          }),
        );

        expect(received).toEqual({
          name: 'ValidationError',
          details: [
            {
              message: "Text Field є обов'язковим полем",
              level: 'error',
              path: ['textfieldLatest'],
              context: {
                validator: 'required',
                hasLabel: true,
                setting: true,
                key: 'textfieldLatest',
                label: 'Text Field',
                value: '',
              },
            },
            {
              message: 'Blue',
              level: 'error',
              path: ['num2'],
              context: {
                validator: 'required',
                hasLabel: false,
                setting: true,
                key: 'num2',
                label: 'Number',
                value: null,
              },
            },
          ],
        });
      });

      it('non-empty', async () => {
        const received = await _formatValidatePromiseResult(
          $formValidation.validate(formSchema, {
            data: {
              textfieldLatest: 'abcdef',
              num2: 1024,
            },
          }),
        );

        expect(received).toEqual({
          name: 'ValidationError',
          details: [
            {
              message: 'Допустима кількість символів – не менше, ніж 10',
              level: 'error',
              path: ['textfieldLatest'],
              context: {
                validator: 'minLength',
                hasLabel: true,
                setting: 10,
                key: 'textfieldLatest',
                label: 'Text Field',
                value: 'abcdef',
              },
            },
          ],
        });
      });

      it('proper-length', async () => {
        const received = await _formatValidatePromiseResult(
          $formValidation.validate(formSchema, {
            data: {
              textfieldLatest: 'abcdef123456',
              num2: 2048,
            },
          }),
        );

        expect(received).toEqual({
          data: {
            textfieldLatest: 'abcdef123456',
            num2: 2048,
            str0: '',
          },
        });
      });

      it('sum', async () => {
        const received = await _formatValidatePromiseResult(
          $formValidation.validate(formSchema, {
            data: {
              textfieldLatest: 'abcdef123456',
              num1: 4096,
              num2: 2048,
            },
          }),
        );

        expect(received).toEqual({
          data: {
            textfieldLatest: 'abcdef123456',
            num1: 4096,
            num2: 2048,
            str0: '',
          },
        });
      });

      it('bad sum', async () => {
        const received = await _formatValidatePromiseResult(
          $formValidation.validate(formSchema, {
            data: {
              textfieldLatest: 'abcdef123456',
              num1: 4096,
              num2: 2048,
              num0: 65536,
            },
          }),
        );

        expect(received).toEqual({
          data: {
            textfieldLatest: 'abcdef123456',
            num1: 4096,
            num2: 2048,
            num0: 65536,
            str0: '',
          },
        });
      });

      it('bad sum str0', async () => {
        const received = await _formatValidatePromiseResult(
          $formValidation.validate(formSchema, {
            data: {
              textfieldLatest: 'abcdef123456',
              num1: 4096,
              num2: 2048,
              str0: 65536,
            },
          }),
        );

        expect(received).toEqual({
          data: {
            textfieldLatest: 'abcdef123456',
            num1: 4096,
            num2: 2048,
            str0: 65536,
          },
        });
      });

      it('bad sum str0 format', async () => {
        const received = await _formatValidatePromiseResult(
          $formValidation.validate(formSchema, {
            data: {
              textfieldLatest: 'abcdef123456',
              num1: 4096,
              num2: 2048,
              str0: [16],
            },
          }),
        );

        expect(received).toEqual({
          name: 'ValidationError',
          details: [
            {
              message: 'Поле не має бути списком',
              level: 'error',
              path: ['str0'],
              context: {
                validator: 'multiple',
                hasLabel: true,
                setting: false,
                key: 'str0',
                label: 'Text Field',
                value: [16],
              },
            },
          ],
        });
      });

      it('bad sum num0 format', async () => {
        const received = await _formatValidatePromiseResult(
          $formValidation.validate(formSchema, {
            data: {
              textfieldLatest: 'abcdef123456',
              num1: 4096,
              num2: 2048,
              num0: [16],
            },
          }),
        );

        expect(received).toEqual({
          name: 'ValidationError',
          details: [
            {
              message: 'Поле не має бути списком',
              level: 'error',
              path: ['num0'],
              context: {
                validator: 'multiple',
                hasLabel: true,
                setting: false,
                key: 'num0',
                label: 'Number',
                value: [16],
              },
            },
          ],
        });
      });

      it('bad long string', async () => {
        const received = await _formatValidatePromiseResult(
          $formValidation.validate(formSchema, {
            data: {
              textfieldLatest: 'abcdef123456'.repeat(10),
              num1: -25,
              num2: -15,
            },
          }),
        );

        expect(received).toEqual({
          name: 'ValidationError',
          details: [
            {
              message: 'Допустима кількість символів – не більше, ніж 20',
              level: 'error',
              path: ['textfieldLatest'],
              context: {
                validator: 'maxLength',
                hasLabel: true,
                setting: 20,
                key: 'textfieldLatest',
                label: 'Text Field',
                value:
                  'abcdef123456abcdef123456abcdef123456abcdef123456abcdef123456abcdef123456abcdef123456abcdef123456abcdef123456abcdef123456',
              },
            },
          ],
        });
      });
    });

    describe('form-with-all-fields-for-validation', () => {
      let formSchema: FormSchema;
      beforeEach(async () => {
        const key = 'form-with-all-fields-for-validation';
        formSchema = await $formProvider.getForm(token, key);
      });

      it('complex submission', async () => {
        const result = await _formatValidatePromiseResult(
          $formValidation.validate(formSchema, {
            data: {
              name: 'Василь',
              emailField: 'email@gmail.com',
              text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean tempor tortor ornare massa laoreet vestibulum. Donec cursus porttitor molestie. Vestibulum a massa metus. Proin aliquet vestibulum tempus. Nulla et viverra lectus, sit amet condimentum nullam.',
              grid: [{}],
              selectBox: { '1': true, '2': false, '3': false },

              checkBox: true,
              selectComponent: [
                { label: 'Перший', value: 'Перший' },

                { label: 'Другий', value: 'Другий' },
              ],
              submit: true,
              dateTime: '2021-08-13T09:00:00.000Z',
              day: '1900-01-01',
              telephoneNumber: 12312312,
              radio: 'друге',
            },
          } as FormSubmission),
        );
        expect(result).toEqual({
          data: {
            name: 'Василь',
            emailField: 'email@gmail.com',
            text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean tempor tortor ornare massa laoreet vestibulum. Donec cursus porttitor molestie. Vestibulum a massa metus. Proin aliquet vestibulum tempus. Nulla et viverra lectus, sit amet condimentum nullam.',
            telephoneNumber: 12312312,
            grid: [{}],
            selectBox: {
              '1': true,
              '2': false,
              '3': false,
            },
            checkBox: true,
            selectComponent: [
              {
                label: 'Перший',
                value: 'Перший',
              },
              {
                label: 'Другий',
                value: 'Другий',
              },
            ],
            radio: 'друге',
            dateTime: '2021-08-13T09:00:00.000Z',
            day: '01/01/1900',
          },
        });
      });
    });

    describe('auto-form-with-files-upload-validation-soma', () => {
      let formSchema: FormSchema;
      beforeEach(async () => {
        const key = 'auto-form-with-files-upload-validation-soma';
        formSchema = await $formProvider.getForm(token, key);
      });

      it('if checksum = "", should return ValidationError', async () => {
        const result = await _formatValidatePromiseResult(
          $formValidation.validate(formSchema, {
            data: {
              secondFile: [
                {
                  checksum: '32c0c392938a2a25a5428a98bcc3fe71570a7a73e4ddc76dd6573362e47207e3',
                  id: '50ac81ad-69a9-49fe-bdf7-ce2531e470ed',
                },
              ],
              thirdFile: [
                {
                  checksum: '904f8771817b0a82d1a25dae6d3f80005b2323588511177e0afc03c36515efea',
                  id: '7f4cf992-58e0-4d7c-b450-9d12dfa4b52b',
                },
              ],
              firstFile: [{ checksum: '', id: '117e5f7c-c649-40d0-a619-e41c26e565da' }],
              submit: true,
            },
          }),
        );
        expect(result).toEqual({
          details: [
            {
              context: {
                hasLabel: false,
                key: 'firstFile',
                label: 'Перший файл',
                setting: true,
                validator: 'required',
                value: [],
              },
              level: 'error',
              message: 'File is not provided!',
              path: ['firstFile'],
            },
          ],
          name: 'ValidationError',
        });
      });

      it('if data submission equal null, should return ValidationError', async () => {
        const result = await _formatValidatePromiseResult(
          $formValidation.validate(formSchema, {
            data: {
              secondFile: [
                {
                  checksum: '32c0c392938a2a25a5428a98bcc3fe71570a7a73e4ddc76dd6573362e47207e3',
                  id: '50ac81ad-69a9-49fe-bdf7-ce2531e470ed',
                },
              ],
              thirdFile: [
                {
                  checksum: '904f8771817b0a82d1a25dae6d3f80005b2323588511177e0afc03c36515efea',
                  id: '7f4cf992-58e0-4d7c-b450-9d12dfa4b52b',
                },
              ],
              firstFile: null,
              submit: true,
            },
          }),
        );
        expect(result).toEqual({
          details: [
            {
              context: {
                hasLabel: false,
                key: 'firstFile',
                label: 'Перший файл',
                setting: true,
                validator: 'required',
                value: [],
              },
              level: 'error',
              message: 'File is not provided!',
              path: ['firstFile'],
            },
          ],
          name: 'ValidationError',
        });
      });
    });
  });

  describe('Field Validation', () => {
    let formSchema: FormSchema;

    describe('add-lab-file', () => {
      beforeEach(async () => {
        const key = 'add-lab-file';
        formSchema = await $formProvider.getForm(token, key);
      });

      it('proper file', () => {
        const result = $formValidation.validateFileMeta(formSchema, 'files', {
          fileName: 'image.png',
          contentType: 'image/png',
          size: 20,
        });
        expect(result).toEqual(true);
      });

      it('bad file', () => {
        try {
          $formValidation.validateFileMeta(formSchema, 'files', {
            fileName: 'image.txt',
            contentType: 'text/plain',
            size: 8192,
          });
        } catch (err) {
          expect((err as Error).message).toEqual(
            'The type of the downloaded file is not supported. Supported types are: application/pdf; image/png; image/jpeg.',
          );
        }
      });

      it('bad file type', () => {
        try {
          $formValidation.validateFileMeta(formSchema, 'files', {
            fileName: 'image.png',
            contentType: 'text/plain',
            size: 8192,
          });
        } catch (err) {
          expect((err as Error).message).toEqual(
            'The type of the downloaded file is not supported. Supported types are: application/pdf; image/png; image/jpeg.',
          );
        }
      });

      it('bad file size', () => {
        try {
          $formValidation.validateFileMeta(formSchema, 'files', {
            fileName: 'image.png',
            contentType: 'image/png',
            size: 100 * 1024 * 1024,
          });
        } catch (err) {
          expect((err as Error).message).toEqual('The size of the downloaded file exceeds 50MB');
        }
      });

      it('missing form field', () => {
        try {
          $formValidation.validateFileMeta(formSchema, 'bad-field', {
            fileName: 'image.png',
            contentType: 'image/png',
            size: 100 * 1024 * 1024,
          });
        } catch (err) {
          expect((err as Error).message).toEqual('The field (bad-field) is not found on the ui form');
        }
      });
    });
  });

  describe('Check field existence', () => {
    let formSchema: FormSchema;

    describe('mdtuddm-11573', () => {
      beforeEach(async () => {
        const key = 'mdtuddm-11573';
        formSchema = await $formProvider.getForm(token, key);
      });

      it('nested component', () => {
        const result = $formValidation.checkFieldsExistence(formSchema, ['textfieldLatest']);
        expect(result.size).toEqual(1);
        expect(result.get('textfieldLatest')).toEqual(true);
      });
    });

    describe('add-lab-file', () => {
      beforeEach(async () => {
        const key = 'add-lab-file';
        formSchema = await $formProvider.getForm(token, key);
      });

      it('check zero fields', () => {
        const result = $formValidation.checkFieldsExistence(formSchema, []);
        expect(result.size).toEqual(0);
      });

      it('check one missing field', () => {
        const result = $formValidation.checkFieldsExistence(formSchema, ['WRONG']);
        expect(result.size).toEqual(1);
        expect(result.get('WRONG')).toEqual(false);
      });

      it('check one existing field', () => {
        const result = $formValidation.checkFieldsExistence(formSchema, ['name']);
        expect(result.size).toEqual(1);
        expect(result.get('name')).toEqual(true);
      });

      it('check multiple mixed field', () => {
        const result = $formValidation.checkFieldsExistence(formSchema, ['name', 'surname', 'file', 'wtf']);
        expect(result.size).toEqual(4);
        expect(Object.fromEntries(result)).toEqual({
          name: true,
          surname: false,
          file: false,
          wtf: false,
        });
        expect(result.get('name')).toEqual(true);
        expect(result.get('surname')).toEqual(false);
        expect(result.get('file')).toEqual(false);
        expect(result.get('wtf')).toEqual(false);
      });
    });
  });
});
