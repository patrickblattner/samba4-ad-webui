import { GROUP_TYPE } from '@samba-ad/shared'
import type { GroupScope, GroupCategory } from '@samba-ad/shared'

/**
 * Determine the scope of a group from its groupType bitmask.
 */
export const getGroupScope = (groupType: number): GroupScope => {
  if (groupType & GROUP_TYPE.UNIVERSAL) return 'universal'
  if (groupType & GROUP_TYPE.DOMAIN_LOCAL) return 'domainLocal'
  return 'global'
}

/**
 * Determine the category of a group from its groupType bitmask.
 */
export const getGroupCategory = (groupType: number): GroupCategory => {
  // SECURITY flag is 0x80000000 — a negative number in signed 32-bit
  return (groupType & GROUP_TYPE.SECURITY) !== 0 ? 'security' : 'distribution'
}

/**
 * Build a groupType bitmask from scope and category strings.
 */
export const buildGroupType = (scope: GroupScope, category: GroupCategory): number => {
  let gt = 0

  switch (scope) {
    case 'global':
      gt |= GROUP_TYPE.GLOBAL
      break
    case 'domainLocal':
      gt |= GROUP_TYPE.DOMAIN_LOCAL
      break
    case 'universal':
      gt |= GROUP_TYPE.UNIVERSAL
      break
  }

  if (category === 'security') {
    gt |= GROUP_TYPE.SECURITY
  }

  // Return as signed 32-bit integer (SECURITY flag makes it negative)
  return gt | 0
}
