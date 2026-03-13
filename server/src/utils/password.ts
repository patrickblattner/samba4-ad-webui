/**
 * Encode a password for AD's unicodePwd attribute.
 * AD requires the password wrapped in double quotes, encoded as UTF-16LE.
 */
export const encodePassword = (password: string): Buffer =>
  Buffer.from(`"${password}"`, 'utf16le')
