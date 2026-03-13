/** GroupType bitmask constants */
export const GROUP_TYPE = {
  GLOBAL: 0x00000002,
  DOMAIN_LOCAL: 0x00000004,
  UNIVERSAL: 0x00000008,
  SECURITY: 0x80000000,
} as const

export type GroupScope = 'global' | 'domainLocal' | 'universal'
export type GroupCategory = 'security' | 'distribution'
