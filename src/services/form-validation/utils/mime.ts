import * as _ from 'lodash';
import { FormFieldValidationInput } from '#app/services/form-validation/types';

export function supportedMimeTypes(filePattern: string): string[] {
  return (
    filePattern
      .split(',')
      .map((s) => s.trim())
      .filter((s) => !!s) ?? []
  );
}

export function validateFilePattern(file: FormFieldValidationInput, filePattern: string) {
  if (!filePattern) {
    return true;
  }
  const pattern = globStringToRegex(filePattern);

  let valid = true;
  if (pattern.regexp && pattern.regexp.length) {
    const regexp = new RegExp(pattern.regexp, 'i');
    valid =
      (!_.isNil(file.contentType) && regexp.test(file.contentType)) ||
      (!_.isNil(file.fileName) && regexp.test(file.fileName));
  }
  valid = pattern.excludes.reduce((result, excludePattern) => {
    const exclude = new RegExp(excludePattern, 'i');
    return (
      result &&
      (_.isNil(file.contentType) || !exclude.test(file.contentType)) &&
      (_.isNil(file.fileName) || !exclude.test(file.fileName))
    );
  }, valid);
  return valid;
}

function globStringToRegex(str: string) {
  str = str.replace(/\s/g, '');

  let regexp = '',
    excludes: string[] = [];
  if (str.length > 2 && str[0] === '/' && str[str.length - 1] === '/') {
    regexp = str.substring(1, str.length - 1);
  } else {
    const split = str.split(',');
    if (split.length > 1) {
      for (let i = 0; i < split.length; i++) {
        const r = globStringToRegex(split[i]);
        if (r.regexp) {
          regexp += `(${r.regexp})`;
          if (i < split.length - 1) {
            regexp += '|';
          }
        } else {
          excludes = excludes.concat(r.excludes);
        }
      }
    } else {
      if (str.startsWith('!')) {
        excludes.push(`^((?!${globStringToRegex(str.substring(1)).regexp}).)*$`);
      } else {
        if (str.startsWith('.')) {
          str = `*${str}`;
        }
        regexp = `^${str.replace(new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\-]', 'g'), '\\$&')}$`;
        regexp = regexp.replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
      }
    }
  }
  return { regexp, excludes };
}
