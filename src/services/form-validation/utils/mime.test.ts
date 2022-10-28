import { supportedMimeTypes, validateFilePattern } from '#app/services/form-validation/utils/mime';
import { FormFieldValidationInput } from '#app/services/form-validation/types';

describe('mime utils', () => {
  describe('supportedMimeTypes', () => {
    it('should turn empty string to empty array', () => {
      expect(supportedMimeTypes('')).toEqual([]);
    });

    it('should turn comma-separated values into list of strings', () => {
      expect(supportedMimeTypes('image/png,application/json,*,text/html,*/*,text/plain')).toEqual([
        'image/png',
        'application/json',
        '*',
        'text/html',
        '*/*',
        'text/plain',
      ]);
    });

    it('should turn comma-separated values with whitespaces into list of strings', () => {
      expect(supportedMimeTypes('image/png, application/json , * ,  text/html ,\t*/*,text/plain  ')).toEqual([
        'image/png',
        'application/json',
        '*',
        'text/html',
        '*/*',
        'text/plain',
      ]);
    });

    it('should ignore multiple empty comma-separated values', () => {
      expect(supportedMimeTypes('image/png, , , image/jpeg ,  text/html,,,text/plain')).toEqual([
        'image/png',
        'image/jpeg',
        'text/html',
        'text/plain',
      ]);
    });
  });

  describe('validateFilePattern', () => {
    function getFormField(contentType: string = 'image/png', fileName: string = 'file.png') {
      return {
        fileName,
        contentType,
        size: 100,
      };
    }
    it('should return false on empty string', () => {
      expect(validateFilePattern('' as unknown as FormFieldValidationInput, 'image/png')).toEqual(false);
    });

    it('should return true on subtype wildcard', () => {
      expect(validateFilePattern(getFormField(), 'image/*')).toEqual(true);
    });

    it('should return true on maintype wildcard', () => {
      expect(validateFilePattern(getFormField(), '*/png')).toEqual(true);
    });

    it('should return true on full wildcard (one-char)', () => {
      expect(validateFilePattern(getFormField(), '*')).toEqual(true);
    });

    it('should return true on full wildcard (two-parts)', () => {
      expect(validateFilePattern(getFormField(), '*/*')).toEqual(true);
    });

    it('should return true on existence in list (png)', () => {
      expect(validateFilePattern(getFormField(), 'image/png,application/json,text/html,text/plain')).toEqual(true);
    });

    it('should return true on existence in list (html)', () => {
      expect(validateFilePattern(getFormField('text/html'), 'image/png,application/json,text/html,text/plain')).toEqual(
        true,
      );
    });

    it('should return false on non-existence in list (gif)', () => {
      expect(validateFilePattern(getFormField('image/gif'), 'image/png,application/json,text/html,text/plain')).toEqual(
        false,
      );
    });

    it('should return true on list with simple wildcard (html)', () => {
      expect(
        validateFilePattern(getFormField('text/html'), 'image/png,application/json,*,text/html,text/plain'),
      ).toEqual(true);
    });

    it('should return true on list with complex wildcard (html)', () => {
      expect(
        validateFilePattern(getFormField('text/html'), 'image/png,application/json,text/html,*/*,text/plain'),
      ).toEqual(true);
    });

    it('should return false on list with image wildcard (html)', () => {
      expect(validateFilePattern(getFormField('text/html'), 'application/json,image/*,text/plain')).toEqual(false);
    });

    it('should return true on list with image wildcard (png)', () => {
      expect(validateFilePattern(getFormField(), 'application/json,image/*,text/plain')).toEqual(true);
    });
  });
});
