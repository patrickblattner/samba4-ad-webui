import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from './crypto.js'

// 32-byte key in hex (64 hex chars)
const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

describe('crypto', () => {
  it('should encrypt and decrypt a simple string', () => {
    const plaintext = 'hello world'
    const encrypted = encrypt(plaintext, TEST_KEY)
    const decrypted = decrypt(encrypted, TEST_KEY)

    expect(decrypted).toBe(plaintext)
  })

  it('should encrypt and decrypt JSON credentials', () => {
    const credentials = JSON.stringify({
      dn: 'CN=Administrator,CN=Users,DC=lab,DC=dev',
      password: 'Admin1234!',
    })
    const encrypted = encrypt(credentials, TEST_KEY)
    const decrypted = decrypt(encrypted, TEST_KEY)

    expect(JSON.parse(decrypted)).toEqual({
      dn: 'CN=Administrator,CN=Users,DC=lab,DC=dev',
      password: 'Admin1234!',
    })
  })

  it('should produce different ciphertexts for the same input (random IV)', () => {
    const plaintext = 'same input'
    const encrypted1 = encrypt(plaintext, TEST_KEY)
    const encrypted2 = encrypt(plaintext, TEST_KEY)

    expect(encrypted1).not.toBe(encrypted2)

    // Both should decrypt to the same value
    expect(decrypt(encrypted1, TEST_KEY)).toBe(plaintext)
    expect(decrypt(encrypted2, TEST_KEY)).toBe(plaintext)
  })

  it('should return format iv:authTag:ciphertext', () => {
    const encrypted = encrypt('test', TEST_KEY)
    const parts = encrypted.split(':')

    expect(parts).toHaveLength(3)
    // IV = 16 bytes = 32 hex chars
    expect(parts[0]).toHaveLength(32)
    // AuthTag = 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32)
    // Ciphertext length > 0
    expect(parts[2].length).toBeGreaterThan(0)
  })

  it('should throw on invalid encrypted format', () => {
    expect(() => decrypt('invalid', TEST_KEY)).toThrow('Invalid encrypted format')
  })

  it('should throw on tampered ciphertext', () => {
    const encrypted = encrypt('test', TEST_KEY)
    const parts = encrypted.split(':')
    // Tamper with ciphertext
    parts[2] = 'ff' + parts[2].slice(2)
    const tampered = parts.join(':')

    expect(() => decrypt(tampered, TEST_KEY)).toThrow()
  })

  it('should throw on wrong key', () => {
    const encrypted = encrypt('test', TEST_KEY)
    const wrongKey = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'

    expect(() => decrypt(encrypted, wrongKey)).toThrow()
  })

  it('should handle empty string', () => {
    const encrypted = encrypt('', TEST_KEY)
    const decrypted = decrypt(encrypted, TEST_KEY)

    expect(decrypted).toBe('')
  })

  it('should handle unicode characters', () => {
    const plaintext = 'Ünïcödé 🔐 Zeichen'
    const encrypted = encrypt(plaintext, TEST_KEY)
    const decrypted = decrypt(encrypted, TEST_KEY)

    expect(decrypted).toBe(plaintext)
  })
})
