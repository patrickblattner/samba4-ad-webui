import { describe, it, expect } from 'vitest'
import { treeChildrenFilter, objectListFilter } from './ldapFilters.js'

describe('treeChildrenFilter', () => {
  it('should return filter for OUs, containers, and builtinDomain', () => {
    const filter = treeChildrenFilter()
    expect(filter).toBe(
      '(|(objectClass=organizationalUnit)(objectClass=container)(objectClass=builtinDomain))'
    )
  })
})

describe('objectListFilter', () => {
  it('should return user filter', () => {
    expect(objectListFilter('user')).toBe(
      '(&(objectClass=user)(objectCategory=person))'
    )
  })

  it('should return group filter', () => {
    expect(objectListFilter('group')).toBe('(objectClass=group)')
  })

  it('should return computer filter', () => {
    expect(objectListFilter('computer')).toBe('(objectClass=computer)')
  })

  it('should return all-objects filter by default', () => {
    expect(objectListFilter()).toBe(
      '(|(&(objectClass=user)(objectCategory=person))(objectClass=group)(objectClass=computer))'
    )
  })

  it('should return all-objects filter for explicit "all"', () => {
    expect(objectListFilter('all')).toBe(
      '(|(&(objectClass=user)(objectCategory=person))(objectClass=group)(objectClass=computer))'
    )
  })
})
