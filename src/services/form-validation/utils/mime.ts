export function supportedMimeTypes(filePattern: string): string[] {
  return (
    filePattern
      .split(',')
      .map((s) => s.trim())
      .filter((s) => !!s) ?? []
  );
}

export function validateFilePattern(filePattern: string, contentType: string): boolean {
  const allowedMimeTypes: string[] = supportedMimeTypes(filePattern);

  return allowedMimeTypes.some((mime) => {
    if (['*', '*/*'].includes(mime)) {
      return true;
    }
    if (mime === contentType) {
      return true;
    }
    const mimeParts: string[] = mime.split('/');
    const contentTypeParts: string[] = contentType.split('/');
    for (let i = 0; i < Math.max(mimeParts.length, contentTypeParts.length); ++i) {
      if (mimeParts[i] !== '*' && mimeParts[i] !== contentTypeParts[i]) {
        // if any of the mime parts not equals to input value's part
        //  and mime part is not wildcard
        //  then this mime is not suitable
        //  else it might be so continue to check other parts
        return false;
      }
    }
    return true;
  });
}
