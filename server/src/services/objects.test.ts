import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Credentials } from '../utils/ldapHelpers.js'

const { mockClient } = vi.hoisted(() => ({
  mockClient: {
    bind: vi.fn(),
    unbind: vi.fn(),
    search: vi.fn(),
  },
}))

vi.mock('./ldap.js', () => ({
  createBoundClient: vi.fn().mockResolvedValue(mockClient),
  search: vi.fn(),
  unbind: vi.fn(),
}))

vi.mock('../config.js', () => ({
  config: {
    ldap: { url: 'ldap://localhost:389', baseDn: 'DC=lab,DC=dev' },
  },
}))

import { listObjects } from './objects.js'
import { search } from './ldap.js'

const credentials: Credentials = {
  dn: 'CN=Administrator,CN=Users,DC=lab,DC=dev',
  password: 'Admin1234!',
}

beforeEach(() => vi.clearAllMocks())

describe('listObjects', () => {
  it('returns paginated results', async () => {
    vi.mocked(search).mockResolvedValueOnce([
      { dn: 'CN=User1,DC=lab,DC=dev', objectClass: ['top', 'person', 'user'], name: 'User1', userAccountControl: 512 },
      { dn: 'CN=User2,DC=lab,DC=dev', objectClass: ['top', 'person', 'user'], name: 'User2', userAccountControl: 512 },
      { dn: 'CN=Group1,DC=lab,DC=dev', objectClass: ['top', 'group'], name: 'Group1' },
    ] as any)

    const result = await listObjects(credentials, 'DC=lab,DC=dev', 'all', 1, 2)

    expect(result.total).toBe(3)
    expect(result.data).toHaveLength(2)
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(2)
    expect(result.totalPages).toBe(2)
  })

  it('returns second page', async () => {
    vi.mocked(search).mockResolvedValueOnce([
      { dn: 'CN=A,DC=lab,DC=dev', objectClass: ['top', 'group'], name: 'A' },
      { dn: 'CN=B,DC=lab,DC=dev', objectClass: ['top', 'group'], name: 'B' },
      { dn: 'CN=C,DC=lab,DC=dev', objectClass: ['top', 'group'], name: 'C' },
    ] as any)

    const result = await listObjects(credentials, 'DC=lab,DC=dev', 'all', 2, 2)

    expect(result.data).toHaveLength(1)
    expect(result.data[0].name).toBe('C')
    expect(result.page).toBe(2)
  })

  it('sorts results by name', async () => {
    vi.mocked(search).mockResolvedValueOnce([
      { dn: 'CN=Zebra,DC=lab,DC=dev', objectClass: ['top', 'group'], name: 'Zebra' },
      { dn: 'CN=Alpha,DC=lab,DC=dev', objectClass: ['top', 'group'], name: 'Alpha' },
    ] as any)

    const result = await listObjects(credentials, 'DC=lab,DC=dev')

    expect(result.data[0].name).toBe('Alpha')
    expect(result.data[1].name).toBe('Zebra')
  })

  it('sets enabled flag for users', async () => {
    vi.mocked(search).mockResolvedValueOnce([
      { dn: 'CN=Active,DC=lab,DC=dev', objectClass: ['top', 'person', 'user'], name: 'Active', userAccountControl: 512 },
      { dn: 'CN=Disabled,DC=lab,DC=dev', objectClass: ['top', 'person', 'user'], name: 'Disabled', userAccountControl: 514 },
    ] as any)

    const result = await listObjects(credentials, 'DC=lab,DC=dev')

    expect(result.data[0].enabled).toBe(true)
    expect(result.data[1].enabled).toBe(false)
  })

  it('does not set enabled for groups', async () => {
    vi.mocked(search).mockResolvedValueOnce([
      { dn: 'CN=Group1,DC=lab,DC=dev', objectClass: ['top', 'group'], name: 'Group1' },
    ] as any)

    const result = await listObjects(credentials, 'DC=lab,DC=dev')

    expect(result.data[0].enabled).toBeUndefined()
  })
})
