import { describe, it, expect } from 'vitest'
import { extractCn, getParentDn, isDomainDn } from './dnUtils.js'

describe('extractCn', () => {
  it('should extract CN value from a DN', () => {
    expect(extractCn('CN=Users,DC=lab,DC=dev')).toBe('Users')
  })

  it('should extract OU value from a DN', () => {
    expect(extractCn('OU=Marketing,DC=lab,DC=dev')).toBe('Marketing')
  })

  it('should extract DC value from a domain DN', () => {
    expect(extractCn('DC=lab,DC=dev')).toBe('lab')
  })

  it('should handle DN with spaces in value', () => {
    expect(extractCn('CN=John Doe,OU=Users,DC=lab,DC=dev')).toBe('John Doe')
  })

  it('should return the original string if no match', () => {
    expect(extractCn('')).toBe('')
  })

  it('should be case-insensitive for attribute names', () => {
    expect(extractCn('cn=Admin,DC=lab,DC=dev')).toBe('Admin')
  })
})

describe('getParentDn', () => {
  it('should return parent DN by removing first component', () => {
    expect(getParentDn('CN=Users,DC=lab,DC=dev')).toBe('DC=lab,DC=dev')
  })

  it('should handle nested OUs', () => {
    expect(getParentDn('OU=Sales,OU=Marketing,DC=lab,DC=dev')).toBe('OU=Marketing,DC=lab,DC=dev')
  })

  it('should return original string for single-component DN', () => {
    expect(getParentDn('DC=dev')).toBe('DC=dev')
  })

  it('should handle domain root', () => {
    expect(getParentDn('DC=lab,DC=dev')).toBe('DC=dev')
  })
})

describe('isDomainDn', () => {
  it('should return true for domain root DN', () => {
    expect(isDomainDn('DC=lab,DC=dev')).toBe(true)
  })

  it('should return true for single DC', () => {
    expect(isDomainDn('DC=dev')).toBe(true)
  })

  it('should return false for CN-prefixed DN', () => {
    expect(isDomainDn('CN=Users,DC=lab,DC=dev')).toBe(false)
  })

  it('should return false for OU-prefixed DN', () => {
    expect(isDomainDn('OU=Marketing,DC=lab,DC=dev')).toBe(false)
  })

  it('should be case-insensitive', () => {
    expect(isDomainDn('dc=lab,dc=dev')).toBe(true)
  })
})
