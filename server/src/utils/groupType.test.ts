import { describe, it, expect } from 'vitest'
import { getGroupScope, getGroupCategory, buildGroupType } from './groupType.js'
import { GROUP_TYPE } from '@samba-ad/shared'

describe('getGroupScope', () => {
  it('should return global for GLOBAL flag', () => {
    expect(getGroupScope(GROUP_TYPE.GLOBAL)).toBe('global')
  })

  it('should return domainLocal for DOMAIN_LOCAL flag', () => {
    expect(getGroupScope(GROUP_TYPE.DOMAIN_LOCAL)).toBe('domainLocal')
  })

  it('should return universal for UNIVERSAL flag', () => {
    expect(getGroupScope(GROUP_TYPE.UNIVERSAL)).toBe('universal')
  })

  it('should return global for security global group', () => {
    const gt = GROUP_TYPE.GLOBAL | GROUP_TYPE.SECURITY
    expect(getGroupScope(gt)).toBe('global')
  })

  it('should return universal for security universal group', () => {
    const gt = GROUP_TYPE.UNIVERSAL | GROUP_TYPE.SECURITY
    expect(getGroupScope(gt)).toBe('universal')
  })

  it('should default to global when no scope flag set', () => {
    expect(getGroupScope(0)).toBe('global')
  })
})

describe('getGroupCategory', () => {
  it('should return security when SECURITY flag is set', () => {
    const gt = GROUP_TYPE.GLOBAL | GROUP_TYPE.SECURITY
    expect(getGroupCategory(gt)).toBe('security')
  })

  it('should return distribution when SECURITY flag is not set', () => {
    expect(getGroupCategory(GROUP_TYPE.GLOBAL)).toBe('distribution')
  })

  it('should handle negative signed 32-bit values', () => {
    // SECURITY flag (0x80000000) makes the number negative in signed 32-bit
    const gt = (GROUP_TYPE.GLOBAL | GROUP_TYPE.SECURITY) | 0
    expect(getGroupCategory(gt)).toBe('security')
  })
})

describe('buildGroupType', () => {
  it('should build global security group type', () => {
    const gt = buildGroupType('global', 'security')
    expect(getGroupScope(gt)).toBe('global')
    expect(getGroupCategory(gt)).toBe('security')
    expect(gt).toBe((GROUP_TYPE.GLOBAL | GROUP_TYPE.SECURITY) | 0)
  })

  it('should build domain local security group type', () => {
    const gt = buildGroupType('domainLocal', 'security')
    expect(getGroupScope(gt)).toBe('domainLocal')
    expect(getGroupCategory(gt)).toBe('security')
  })

  it('should build universal distribution group type', () => {
    const gt = buildGroupType('universal', 'distribution')
    expect(getGroupScope(gt)).toBe('universal')
    expect(getGroupCategory(gt)).toBe('distribution')
    expect(gt).toBe(GROUP_TYPE.UNIVERSAL)
  })

  it('should build global distribution group type', () => {
    const gt = buildGroupType('global', 'distribution')
    expect(getGroupScope(gt)).toBe('global')
    expect(getGroupCategory(gt)).toBe('distribution')
    expect(gt).toBe(GROUP_TYPE.GLOBAL)
  })

  it('should round-trip with getGroupScope and getGroupCategory', () => {
    const scopes = ['global', 'domainLocal', 'universal'] as const
    const categories = ['security', 'distribution'] as const

    for (const scope of scopes) {
      for (const category of categories) {
        const gt = buildGroupType(scope, category)
        expect(getGroupScope(gt)).toBe(scope)
        expect(getGroupCategory(gt)).toBe(category)
      }
    }
  })
})
