import { supportedMimeTypes, validateFilePattern } from '#app/services/form-validation/utils/mime';

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
    it('should return false on empty string', () => {
      expect(validateFilePattern('', 'image/png')).toEqual(false);
    });

    it('should return true on subtype wildcard', () => {
      expect(validateFilePattern('image/*', 'image/png')).toEqual(true);
    });

    it('should return true on maintype wildcard', () => {
      expect(validateFilePattern('*/png', 'image/png')).toEqual(true);
    });

    it('should return true on full wildcard (one-char)', () => {
      expect(validateFilePattern('*', 'image/png')).toEqual(true);
    });

    it('should return true on full wildcard (two-parts)', () => {
      expect(validateFilePattern('*/*', 'image/png')).toEqual(true);
    });

    it('should return true on existence in list (png)', () => {
      expect(validateFilePattern('image/png,application/json,text/html,text/plain', 'image/png')).toEqual(true);
    });

    it('should return true on existence in list (html)', () => {
      expect(validateFilePattern('image/png,application/json,text/html,text/plain', 'text/html')).toEqual(true);
    });

    it('should return false on non-existence in list (gif)', () => {
      expect(validateFilePattern('image/png,application/json,text/html,text/plain', 'image/gif')).toEqual(false);
    });

    it('should return true on list with simple wildcard (html)', () => {
      expect(validateFilePattern('image/png,application/json,*,text/html,text/plain', 'text/html')).toEqual(true);
    });

    it('should return true on list with complex wildcard (html)', () => {
      expect(validateFilePattern('image/png,application/json,text/html,*/*,text/plain', 'text/html')).toEqual(true);
    });

    it('should return false on list with image wildcard (html)', () => {
      expect(validateFilePattern('application/json,image/*,text/plain', 'text/html')).toEqual(false);
    });

    it('should return true on list with image wildcard (png)', () => {
      expect(validateFilePattern('application/json,image/*,text/plain', 'image/png')).toEqual(true);
    });
  });
});
