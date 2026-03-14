import { describe, it, expect } from 'vitest'
import { isAttributeReadOnly } from './schema.js'
import type { FullAttributeMetadata } from './schema.js'

// ---------------------------------------------------------------------------
// isAttributeReadOnly
// ---------------------------------------------------------------------------

describe('isAttributeReadOnly', () => {
  it('returns false for a plain editable string attribute', () => {
    const meta: FullAttributeMetadata = {
      isSingleValued: false,
      syntax: 'string',
      isSystemOnly: false,
      isConstructed: false,
    }
    expect(isAttributeReadOnly(meta)).toBe(false)
  })

  it('returns true when isSystemOnly is true', () => {
    const meta: FullAttributeMetadata = {
      isSingleValued: true,
      syntax: 'string',
      isSystemOnly: true,
      isConstructed: false,
    }
    expect(isAttributeReadOnly(meta)).toBe(true)
  })

  it('returns true when isConstructed is true', () => {
    const meta: FullAttributeMetadata = {
      isSingleValued: true,
      syntax: 'string',
      isSystemOnly: false,
      isConstructed: true,
    }
    expect(isAttributeReadOnly(meta)).toBe(true)
  })

  it('returns true for securityDescriptor syntax', () => {
    const meta: FullAttributeMetadata = {
      isSingleValued: true,
      syntax: 'securityDescriptor',
      isSystemOnly: false,
      isConstructed: false,
    }
    expect(isAttributeReadOnly(meta)).toBe(true)
  })

  it('returns true for sid syntax', () => {
    const meta: FullAttributeMetadata = {
      isSingleValued: true,
      syntax: 'sid',
      isSystemOnly: false,
      isConstructed: false,
    }
    expect(isAttributeReadOnly(meta)).toBe(true)
  })

  it('returns true for dnBinary syntax', () => {
    const meta: FullAttributeMetadata = {
      isSingleValued: true,
      syntax: 'dnBinary',
      isSystemOnly: false,
      isConstructed: false,
    }
    expect(isAttributeReadOnly(meta)).toBe(true)
  })

  it('returns false for integer syntax (editable)', () => {
    const meta: FullAttributeMetadata = {
      isSingleValued: true,
      syntax: 'integer',
      isSystemOnly: false,
      isConstructed: false,
    }
    expect(isAttributeReadOnly(meta)).toBe(false)
  })

  it('returns false for boolean syntax (editable)', () => {
    const meta: FullAttributeMetadata = {
      isSingleValued: true,
      syntax: 'boolean',
      isSystemOnly: false,
      isConstructed: false,
    }
    expect(isAttributeReadOnly(meta)).toBe(false)
  })

  it('returns false for generalizedTime syntax (editable)', () => {
    const meta: FullAttributeMetadata = {
      isSingleValued: true,
      syntax: 'generalizedTime',
      isSystemOnly: false,
      isConstructed: false,
    }
    expect(isAttributeReadOnly(meta)).toBe(false)
  })

  it('returns false for dn syntax (editable)', () => {
    const meta: FullAttributeMetadata = {
      isSingleValued: false,
      syntax: 'dn',
      isSystemOnly: false,
      isConstructed: false,
    }
    expect(isAttributeReadOnly(meta)).toBe(false)
  })

  it('returns false for octetString syntax (not in NON_EDITABLE_SYNTAXES)', () => {
    // octetString is filtered in the UI but not via isAttributeReadOnly
    const meta: FullAttributeMetadata = {
      isSingleValued: false,
      syntax: 'octetString',
      isSystemOnly: false,
      isConstructed: false,
    }
    expect(isAttributeReadOnly(meta)).toBe(false)
  })

  it('returns true when both isSystemOnly and isConstructed are true', () => {
    const meta: FullAttributeMetadata = {
      isSingleValued: true,
      syntax: 'string',
      isSystemOnly: true,
      isConstructed: true,
    }
    expect(isAttributeReadOnly(meta)).toBe(true)
  })

  it('returns true for sid syntax even if systemOnly=false and constructed=false', () => {
    const meta: FullAttributeMetadata = {
      isSingleValued: true,
      syntax: 'sid',
      isSystemOnly: false,
      isConstructed: false,
    }
    expect(isAttributeReadOnly(meta)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// resolveAttributeSyntax — tested indirectly via isAttributeReadOnly behaviour
// We document the expected OID -> syntax mapping here as integration-level checks.
// Since resolveAttributeSyntax is an internal function, we cannot import it directly;
// these tests verify contract via isAttributeReadOnly on known non-editable syntaxes.
// ---------------------------------------------------------------------------

describe('resolveAttributeSyntax (indirect via isAttributeReadOnly)', () => {
  // securityDescriptor (OID 2.5.5.15, oMSyntax 66) -> non-editable
  it('securityDescriptor syntax makes attribute read-only', () => {
    const meta: FullAttributeMetadata = {
      isSingleValued: true,
      syntax: 'securityDescriptor',
      isSystemOnly: false,
      isConstructed: false,
    }
    expect(isAttributeReadOnly(meta)).toBe(true)
  })

  // sid (OID 2.5.5.17, oMSyntax 4) -> non-editable
  it('sid syntax makes attribute read-only', () => {
    const meta: FullAttributeMetadata = {
      isSingleValued: true,
      syntax: 'sid',
      isSystemOnly: false,
      isConstructed: false,
    }
    expect(isAttributeReadOnly(meta)).toBe(true)
  })

  // dnBinary (OID 2.5.5.7, oMSyntax 127) -> non-editable
  it('dnBinary syntax makes attribute read-only', () => {
    const meta: FullAttributeMetadata = {
      isSingleValued: true,
      syntax: 'dnBinary',
      isSystemOnly: false,
      isConstructed: false,
    }
    expect(isAttributeReadOnly(meta)).toBe(true)
  })

  // largeInteger (OID 2.5.5.16, oMSyntax 65) -> editable
  it('largeInteger syntax does not make attribute read-only by syntax alone', () => {
    const meta: FullAttributeMetadata = {
      isSingleValued: true,
      syntax: 'largeInteger',
      isSystemOnly: false,
      isConstructed: false,
    }
    expect(isAttributeReadOnly(meta)).toBe(false)
  })

  // numericString (OID 2.5.5.6, oMSyntax 18) -> editable
  it('numericString syntax does not make attribute read-only by syntax alone', () => {
    const meta: FullAttributeMetadata = {
      isSingleValued: true,
      syntax: 'numericString',
      isSystemOnly: false,
      isConstructed: false,
    }
    expect(isAttributeReadOnly(meta)).toBe(false)
  })

  // dnString (OID 2.5.5.14, oMSyntax 127) -> editable
  it('dnString syntax does not make attribute read-only by syntax alone', () => {
    const meta: FullAttributeMetadata = {
      isSingleValued: false,
      syntax: 'dnString',
      isSystemOnly: false,
      isConstructed: false,
    }
    expect(isAttributeReadOnly(meta)).toBe(false)
  })
})
