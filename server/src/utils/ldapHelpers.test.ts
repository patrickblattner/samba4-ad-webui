import { describe, it, expect } from 'vitest'
import { str, strArr, num, toStringArray, determineObjectType, isAccountEnabled } from './ldapHelpers.js'

describe('str', () => {
  it('returns undefined for null/undefined', () => {
    expect(str(undefined)).toBeUndefined()
    expect(str(null)).toBeUndefined()
  })

  it('returns string from string value', () => {
    expect(str('hello')).toBe('hello')
  })

  it('returns first element from array', () => {
    expect(str(['first', 'second'])).toBe('first')
  })

  it('converts number to string', () => {
    expect(str(42)).toBe('42')
  })

  it('returns undefined for empty array', () => {
    expect(str([])).toBeUndefined()
  })
})

describe('strArr', () => {
  it('returns undefined for null/undefined', () => {
    expect(strArr(undefined)).toBeUndefined()
    expect(strArr(null)).toBeUndefined()
  })

  it('wraps single value in array', () => {
    expect(strArr('hello')).toEqual(['hello'])
  })

  it('returns array as-is (stringified)', () => {
    expect(strArr(['a', 'b'])).toEqual(['a', 'b'])
  })

  it('converts numbers in array to strings', () => {
    expect(strArr([1, 2])).toEqual(['1', '2'])
  })
})

describe('num', () => {
  it('returns undefined for null/undefined', () => {
    expect(num(undefined)).toBeUndefined()
    expect(num(null)).toBeUndefined()
  })

  it('returns number from number value', () => {
    expect(num(42)).toBe(42)
  })

  it('parses number from string', () => {
    expect(num('512')).toBe(512)
  })

  it('returns first element from array as number', () => {
    expect(num(['512', '1024'])).toBe(512)
  })

  it('returns undefined for NaN', () => {
    expect(num('not-a-number')).toBeUndefined()
  })
})

describe('toStringArray', () => {
  it('converts array to string array', () => {
    expect(toStringArray(['a', 'b'])).toEqual(['a', 'b'])
  })

  it('wraps string in array', () => {
    expect(toStringArray('hello')).toEqual(['hello'])
  })

  it('converts Buffer to string array', () => {
    expect(toStringArray(Buffer.from('test'))).toEqual(['test'])
  })

  it('returns empty array for other types', () => {
    expect(toStringArray(42)).toEqual([])
    expect(toStringArray(null)).toEqual([])
    expect(toStringArray(undefined)).toEqual([])
  })
})

describe('determineObjectType', () => {
  it('detects computer', () => {
    expect(determineObjectType(['top', 'person', 'user', 'computer'])).toBe('computer')
  })

  it('detects group', () => {
    expect(determineObjectType(['top', 'group'])).toBe('group')
  })

  it('detects user (person + user)', () => {
    expect(determineObjectType(['top', 'person', 'organizationalPerson', 'user'])).toBe('user')
  })

  it('detects contact', () => {
    expect(determineObjectType(['top', 'person', 'contact'])).toBe('contact')
  })

  it('returns unknown for unrecognized classes', () => {
    expect(determineObjectType(['top', 'organizationalUnit'])).toBe('unknown')
  })

  it('is case-insensitive', () => {
    expect(determineObjectType(['TOP', 'GROUP'])).toBe('group')
  })

  it('prioritizes computer over user', () => {
    // Computer objects have both user and computer in objectClass
    expect(determineObjectType(['top', 'person', 'user', 'Computer'])).toBe('computer')
  })
})

describe('isAccountEnabled', () => {
  it('returns true when ACCOUNTDISABLE not set', () => {
    expect(isAccountEnabled(512)).toBe(true) // NORMAL_ACCOUNT
  })

  it('returns false when ACCOUNTDISABLE is set', () => {
    expect(isAccountEnabled(514)).toBe(false) // NORMAL_ACCOUNT | ACCOUNTDISABLE
  })

  it('handles string values', () => {
    expect(isAccountEnabled('512')).toBe(true)
    expect(isAccountEnabled('514')).toBe(false)
  })

  it('returns true for NaN/undefined', () => {
    expect(isAccountEnabled(undefined)).toBe(true)
    expect(isAccountEnabled('invalid')).toBe(true)
  })
})
