import { describe, it, expect } from 'vitest'
import { hasFlag, setFlag, clearFlag, isDisabled } from './uac.js'
import { UAC_FLAGS } from '@samba-ad/shared'

describe('hasFlag', () => {
  it('should return true when flag is set', () => {
    const uac = UAC_FLAGS.NORMAL_ACCOUNT | UAC_FLAGS.ACCOUNTDISABLE
    expect(hasFlag(uac, UAC_FLAGS.ACCOUNTDISABLE)).toBe(true)
    expect(hasFlag(uac, UAC_FLAGS.NORMAL_ACCOUNT)).toBe(true)
  })

  it('should return false when flag is not set', () => {
    const uac = UAC_FLAGS.NORMAL_ACCOUNT
    expect(hasFlag(uac, UAC_FLAGS.ACCOUNTDISABLE)).toBe(false)
  })

  it('should handle zero', () => {
    expect(hasFlag(0, UAC_FLAGS.ACCOUNTDISABLE)).toBe(false)
  })
})

describe('setFlag', () => {
  it('should set a flag', () => {
    const uac = UAC_FLAGS.NORMAL_ACCOUNT
    const result = setFlag(uac, UAC_FLAGS.ACCOUNTDISABLE)
    expect(result).toBe(UAC_FLAGS.NORMAL_ACCOUNT | UAC_FLAGS.ACCOUNTDISABLE)
  })

  it('should be idempotent', () => {
    const uac = UAC_FLAGS.NORMAL_ACCOUNT | UAC_FLAGS.ACCOUNTDISABLE
    const result = setFlag(uac, UAC_FLAGS.ACCOUNTDISABLE)
    expect(result).toBe(uac)
  })
})

describe('clearFlag', () => {
  it('should clear a flag', () => {
    const uac = UAC_FLAGS.NORMAL_ACCOUNT | UAC_FLAGS.ACCOUNTDISABLE
    const result = clearFlag(uac, UAC_FLAGS.ACCOUNTDISABLE)
    expect(result).toBe(UAC_FLAGS.NORMAL_ACCOUNT)
  })

  it('should be idempotent when flag is not set', () => {
    const uac = UAC_FLAGS.NORMAL_ACCOUNT
    const result = clearFlag(uac, UAC_FLAGS.ACCOUNTDISABLE)
    expect(result).toBe(UAC_FLAGS.NORMAL_ACCOUNT)
  })
})

describe('isDisabled', () => {
  it('should return true when ACCOUNTDISABLE is set', () => {
    expect(isDisabled(UAC_FLAGS.NORMAL_ACCOUNT | UAC_FLAGS.ACCOUNTDISABLE)).toBe(true)
  })

  it('should return false when ACCOUNTDISABLE is not set', () => {
    expect(isDisabled(UAC_FLAGS.NORMAL_ACCOUNT)).toBe(false)
  })

  it('should detect disabled even with multiple flags', () => {
    const uac = UAC_FLAGS.NORMAL_ACCOUNT | UAC_FLAGS.ACCOUNTDISABLE | UAC_FLAGS.DONT_EXPIRE_PASSWORD
    expect(isDisabled(uac)).toBe(true)
  })
})
