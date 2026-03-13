/**
 * sAMAccountName validation per AD schema.
 *
 * Length limits:
 *   - User: 20 characters
 *   - Group: 256 characters
 *   - Computer: 15 characters (without trailing $)
 *
 * Illegal characters: " / \ [ ] : ; | = , + * ? < >
 */

export type SamObjectType = 'user' | 'group' | 'computer'

const SAM_MAX_LENGTH: Record<SamObjectType, number> = {
  user: 20,
  group: 256,
  computer: 15,
}

const SAM_ILLEGAL_CHARS = /["/\\[\]:;|=,+*?<>]/

export interface SamValidationResult {
  valid: boolean
  error?: string
}

export function validateSamAccountName(
  value: string,
  objectType: SamObjectType,
): SamValidationResult {
  if (!value.trim()) {
    return { valid: false, error: 'sAMAccountName is required.' }
  }

  const trimmed = value.trim()

  // For computers, strip trailing $ before checking length
  const nameToCheck = objectType === 'computer'
    ? trimmed.replace(/\$$/, '')
    : trimmed

  const maxLen = SAM_MAX_LENGTH[objectType]
  if (nameToCheck.length > maxLen) {
    return {
      valid: false,
      error: `sAMAccountName must not exceed ${maxLen} characters for ${objectType} objects (currently ${nameToCheck.length}).`,
    }
  }

  const match = trimmed.match(SAM_ILLEGAL_CHARS)
  if (match) {
    return {
      valid: false,
      error: `sAMAccountName contains illegal character: ${match[0]}`,
    }
  }

  return { valid: true }
}
