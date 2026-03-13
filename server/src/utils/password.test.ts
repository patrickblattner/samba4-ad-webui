import { describe, it, expect } from 'vitest'
import { encodePassword } from './password.js'

describe('encodePassword', () => {
  it('should return a Buffer', () => {
    const result = encodePassword('Test1234!')
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('should encode with UTF-16LE', () => {
    const result = encodePassword('Test1234!')
    const expected = Buffer.from('"Test1234!"', 'utf16le')
    expect(result).toEqual(expected)
  })

  it('should wrap the password in double quotes', () => {
    const result = encodePassword('hello')
    // Decode back to check quotes
    const decoded = result.toString('utf16le')
    expect(decoded).toBe('"hello"')
  })

  it('should handle empty password', () => {
    const result = encodePassword('')
    const decoded = result.toString('utf16le')
    expect(decoded).toBe('""')
  })

  it('should handle special characters', () => {
    const result = encodePassword('P@$$w0rd!')
    const decoded = result.toString('utf16le')
    expect(decoded).toBe('"P@$$w0rd!"')
  })

  it('should handle unicode characters', () => {
    const result = encodePassword('Pässwörd')
    const decoded = result.toString('utf16le')
    expect(decoded).toBe('"Pässwörd"')
  })
})
