import { describe, it, expect } from 'vitest'
import { escapeDnValue, extractCn, getParentDn, isDomainDn, splitDnComponents } from './dnUtils.js'

describe('escapeDnValue', () => {
  it('should return plain string unchanged', () => {
    expect(escapeDnValue('Users')).toBe('Users')
  })

  it('should escape comma', () => {
    expect(escapeDnValue('Last, First')).toBe('Last\\, First')
  })

  it('should escape equals sign', () => {
    expect(escapeDnValue('a=b')).toBe('a\\=b')
  })

  it('should escape plus sign', () => {
    expect(escapeDnValue('a+b')).toBe('a\\+b')
  })

  it('should escape backslash', () => {
    expect(escapeDnValue('a\\b')).toBe('a\\\\b')
  })

  it('should escape double quote', () => {
    expect(escapeDnValue('a"b')).toBe('a\\"b')
  })

  it('should escape angle brackets', () => {
    expect(escapeDnValue('<admin>')).toBe('\\<admin\\>')
  })

  it('should escape semicolon', () => {
    expect(escapeDnValue('a;b')).toBe('a\\;b')
  })

  it('should escape leading hash', () => {
    expect(escapeDnValue('#admin')).toBe('\\#admin')
  })

  it('should escape leading space', () => {
    expect(escapeDnValue(' admin')).toBe('\\ admin')
  })

  it('should escape trailing space', () => {
    expect(escapeDnValue('admin ')).toBe('admin\\ ')
  })

  it('should handle multiple special characters', () => {
    expect(escapeDnValue('a,b=c+d')).toBe('a\\,b\\=c\\+d')
  })

  it('should return empty string for empty input', () => {
    expect(escapeDnValue('')).toBe('')
  })

  it('should escape backslash before other specials to avoid double-escaping', () => {
    // Input: "a\,b" should become "a\\\\,b" — backslash escaped, then comma escaped
    // Wait — "a\,b" has a backslash then comma.
    // Step 1: escape backslash: "a\\,b"
    // Step 2: escape comma: "a\\\,b"
    expect(escapeDnValue('a\\,b')).toBe('a\\\\\\,b')
  })
})

describe('splitDnComponents', () => {
  it('should split simple DN', () => {
    expect(splitDnComponents('CN=Users,DC=lab,DC=dev')).toEqual([
      'CN=Users', 'DC=lab', 'DC=dev',
    ])
  })

  it('should handle escaped commas', () => {
    expect(splitDnComponents('CN=Last\\, First,DC=lab,DC=dev')).toEqual([
      'CN=Last\\, First', 'DC=lab', 'DC=dev',
    ])
  })

  it('should handle single component', () => {
    expect(splitDnComponents('DC=dev')).toEqual(['DC=dev'])
  })

  it('should handle empty string', () => {
    expect(splitDnComponents('')).toEqual([])
  })
})

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

  it('should handle escaped commas in CN value', () => {
    expect(extractCn('CN=Last\\, First,DC=lab,DC=dev')).toBe('Last, First')
  })

  it('should handle escaped backslash in CN value', () => {
    expect(extractCn('CN=path\\\\share,DC=lab,DC=dev')).toBe('path\\share')
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

  it('should handle escaped commas in first component', () => {
    expect(getParentDn('CN=Last\\, First,DC=lab,DC=dev')).toBe('DC=lab,DC=dev')
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

  it('should handle escaped values correctly', () => {
    // A DC with an escaped comma is still a valid DC component
    expect(isDomainDn('DC=lab\\,test,DC=dev')).toBe(true)
  })
})

describe('round-trip: escapeDnValue -> build DN -> extractCn', () => {
  it('should round-trip a value with comma', () => {
    const original = 'Last, First'
    const escaped = escapeDnValue(original)
    const dn = `CN=${escaped},DC=lab,DC=dev`
    expect(extractCn(dn)).toBe(original)
  })

  it('should round-trip a value with special characters', () => {
    const original = 'Test+User <admin>'
    const escaped = escapeDnValue(original)
    const dn = `CN=${escaped},DC=lab,DC=dev`
    expect(extractCn(dn)).toBe(original)
  })

  it('should round-trip a plain value', () => {
    const original = 'SimpleUser'
    const escaped = escapeDnValue(original)
    const dn = `CN=${escaped},DC=lab,DC=dev`
    expect(extractCn(dn)).toBe(original)
  })
})
