import {
  FileMaxSizeError,
  MissingFormComponentError,
  UnsupportedFileTypeError,
  UnsupportedSizeDefinition,
} from '#app/services/form-validation/types/errors';
import { FileSizeDefinition } from '#app/services/form-validation/types/enums';

describe('form-validation errors', () => {
  describe('UnsupportedFileTypeError', () => {
    it('should output custom message', () => {
      const error = new UnsupportedFileTypeError('', 'CUSTOM');
      expect(error.message).toEqual('CUSTOM');
    });

    it('should output default message with single mime', () => {
      const error = new UnsupportedFileTypeError('image/png');
      expect(error.message).toEqual(
        'The type of the downloaded file is not supported. Supported types are: image/png.',
      );
    });

    it('should output default message with multiple mime', () => {
      const error = new UnsupportedFileTypeError('image/png,application/pdf,,*/*, text/plain');
      expect(error.message).toEqual(
        'The type of the downloaded file is not supported. Supported types are: image/png; application/pdf; */*; text/plain.',
      );
    });
  });

  describe('UnsupportedSizeDefinition', () => {
    it('should output custom message', () => {
      const error = new UnsupportedSizeDefinition('', 'CUSTOM');
      expect(error.message).toEqual('CUSTOM');
    });

    it('should output default message', () => {
      const error = new UnsupportedSizeDefinition('TB');
      expect(error.message).toEqual(
        `The file size definition specified in the ui form is not supported (TB). Supported file size definitions: [${Object.values(
          FileSizeDefinition,
        ).join(', ')}].`,
      );
    });
  });

  describe('FileMaxSizeError', () => {
    it('should output custom message', () => {
      const error = new FileMaxSizeError('', 'CUSTOM');
      expect(error.message).toEqual('CUSTOM');
    });

    it('should output default message', () => {
      const error = new FileMaxSizeError('10MB');
      expect(error.message).toEqual('The size of the downloaded file exceeds 10MB');
    });
  });

  describe('MissingFormComponentError', () => {
    it('should output custom message', () => {
      const error = new MissingFormComponentError('', 'CUSTOM');
      expect(error.message).toEqual('CUSTOM');
    });

    it('should output default message', () => {
      const error = new MissingFormComponentError('text');
      expect(error.message).toEqual('The field (text) is not found on the ui form');
    });
  });
});
