import { describe, it, expect } from 'vitest'
import { validateSamAccountName } from '@samba-ad/shared'

describe('validateSamAccountName', () => {
  describe('required check', () => {
    it('rejects empty string', () => {
      const result = validateSamAccountName('', 'user')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('required')
    })

    it('rejects whitespace-only string', () => {
      const result = validateSamAccountName('   ', 'user')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('required')
    })
  })

  describe('length limits', () => {
    it('accepts user name up to 20 chars', () => {
      expect(validateSamAccountName('a'.repeat(20), 'user').valid).toBe(true)
    })

    it('rejects user name over 20 chars', () => {
      const result = validateSamAccountName('a'.repeat(21), 'user')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('20')
    })

    it('accepts group name up to 256 chars', () => {
      expect(validateSamAccountName('a'.repeat(256), 'group').valid).toBe(true)
    })

    it('rejects group name over 256 chars', () => {
      const result = validateSamAccountName('a'.repeat(257), 'group')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('256')
    })

    it('accepts computer name up to 15 chars', () => {
      expect(validateSamAccountName('a'.repeat(15), 'computer').valid).toBe(true)
    })

    it('rejects computer name over 15 chars', () => {
      const result = validateSamAccountName('a'.repeat(16), 'computer')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('15')
    })

    it('strips trailing $ for computer length check', () => {
      // 15 chars + $ = 16 total, but should be valid since $ is stripped
      expect(validateSamAccountName('a'.repeat(15) + '$', 'computer').valid).toBe(true)
    })

    it('rejects computer with $ when base name exceeds 15', () => {
      const result = validateSamAccountName('a'.repeat(16) + '$', 'computer')
      expect(result.valid).toBe(false)
    })
  })

  describe('illegal characters', () => {
    const illegalChars = ['"', '/', '\\', '[', ']', ':', ';', '|', '=', ',', '+', '*', '?', '<', '>']

    for (const char of illegalChars) {
      it(`rejects name containing "${char}"`, () => {
        const result = validateSamAccountName(`test${char}name`, 'user')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('illegal character')
      })
    }
  })

  describe('valid names', () => {
    it('accepts simple alphanumeric name', () => {
      expect(validateSamAccountName('john.doe', 'user').valid).toBe(true)
    })

    it('accepts name with hyphen and underscore', () => {
      expect(validateSamAccountName('john_doe-2', 'user').valid).toBe(true)
    })

    it('accepts name with spaces', () => {
      expect(validateSamAccountName('Domain Admins', 'group').valid).toBe(true)
    })

    it('accepts computer name with $', () => {
      expect(validateSamAccountName('WORKSTATION$', 'computer').valid).toBe(true)
    })
  })
})
