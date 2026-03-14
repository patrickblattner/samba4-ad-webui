import { describe, it, expect } from 'vitest'
import { escapeLdapFilterValue } from './ldapEscape.js'

describe('escapeLdapFilterValue', () => {
  it('returns plain strings unchanged', () => {
    expect(escapeLdapFilterValue('admin')).toBe('admin')
    expect(escapeLdapFilterValue('user@domain.com')).toBe('user@domain.com')
  })

  it('escapes backslash', () => {
    expect(escapeLdapFilterValue('a\\b')).toBe('a\\5cb')
  })

  it('escapes asterisk', () => {
    expect(escapeLdapFilterValue('user*')).toBe('user\\2a')
  })

  it('escapes parentheses', () => {
    expect(escapeLdapFilterValue('user)(cn=*')).toBe('user\\29\\28cn=\\2a')
  })

  it('escapes NUL byte', () => {
    expect(escapeLdapFilterValue('user\x00name')).toBe('user\\00name')
  })

  it('escapes a realistic LDAP injection payload', () => {
    // Attacker tries: admin)(|(sAMAccountName=*))
    const malicious = 'admin)(|(sAMAccountName=*))'
    const escaped = escapeLdapFilterValue(malicious)
    expect(escaped).toBe('admin\\29\\28|\\28sAMAccountName=\\2a\\29\\29')
    expect(escaped).not.toContain('(')
    expect(escaped).not.toContain(')')
    expect(escaped).not.toContain('*')
  })

  it('handles empty string', () => {
    expect(escapeLdapFilterValue('')).toBe('')
  })
})
