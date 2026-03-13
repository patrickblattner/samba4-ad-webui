import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Credentials } from '../utils/ldapHelpers.js'

const { mockClient } = vi.hoisted(() => ({
  mockClient: {
    add: vi.fn(),
    modify: vi.fn(),
    del: vi.fn(),
    modifyDN: vi.fn(),
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

import { createOu, updateOu, deleteOu, renameOu } from './ous.js'
import { search, unbind } from './ldap.js'

const credentials: Credentials = {
  dn: 'CN=Administrator,CN=Users,DC=lab,DC=dev',
  password: 'Admin1234!',
}

beforeEach(() => vi.clearAllMocks())

describe('createOu', () => {
  it('creates OU with correct DN and attributes', async () => {
    const dn = await createOu(credentials, 'Marketing', 'DC=lab,DC=dev', 'Marketing department')

    expect(dn).toBe('OU=Marketing,DC=lab,DC=dev')
    expect(mockClient.add).toHaveBeenCalledWith(
      'OU=Marketing,DC=lab,DC=dev',
      expect.objectContaining({
        objectClass: ['top', 'organizationalUnit'],
        description: 'Marketing department',
      }),
    )
  })

  it('creates OU without description', async () => {
    const dn = await createOu(credentials, 'Sales', 'DC=lab,DC=dev')

    expect(dn).toBe('OU=Sales,DC=lab,DC=dev')
    const attrs = mockClient.add.mock.calls[0][1]
    expect(attrs.description).toBeUndefined()
  })
})

describe('updateOu', () => {
  it('replaces description', async () => {
    await updateOu(credentials, 'OU=Marketing,DC=lab,DC=dev', 'Updated description')

    expect(mockClient.modify).toHaveBeenCalledWith(
      'OU=Marketing,DC=lab,DC=dev',
      expect.arrayContaining([
        expect.objectContaining({ operation: 'replace' }),
      ]),
    )
  })

  it('deletes description when empty string', async () => {
    await updateOu(credentials, 'OU=Marketing,DC=lab,DC=dev', '')

    expect(mockClient.modify).toHaveBeenCalledWith(
      'OU=Marketing,DC=lab,DC=dev',
      expect.arrayContaining([
        expect.objectContaining({ operation: 'delete' }),
      ]),
    )
  })

  it('does nothing when description is undefined', async () => {
    await updateOu(credentials, 'OU=Marketing,DC=lab,DC=dev', undefined)

    expect(mockClient.modify).not.toHaveBeenCalled()
  })
})

describe('deleteOu', () => {
  it('deletes OU directly when not recursive', async () => {
    await deleteOu(credentials, 'OU=Marketing,DC=lab,DC=dev', false)

    expect(mockClient.del).toHaveBeenCalledWith('OU=Marketing,DC=lab,DC=dev')
  })

  it('deletes children first when recursive', async () => {
    vi.mocked(search).mockResolvedValueOnce([
      { dn: 'OU=Marketing,DC=lab,DC=dev' } as any,
      { dn: 'CN=User1,OU=Marketing,DC=lab,DC=dev' } as any,
      { dn: 'CN=User2,OU=Sub,OU=Marketing,DC=lab,DC=dev' } as any,
      { dn: 'OU=Sub,OU=Marketing,DC=lab,DC=dev' } as any,
    ])

    await deleteOu(credentials, 'OU=Marketing,DC=lab,DC=dev', true)

    // Deepest entries should be deleted first
    const delCalls = mockClient.del.mock.calls.map(c => c[0])
    // CN=User2 has 4 components, OU=Sub has 3, CN=User1 has 3, then the OU itself
    expect(delCalls[0]).toBe('CN=User2,OU=Sub,OU=Marketing,DC=lab,DC=dev')
    // The OU=Marketing itself should be last
    expect(delCalls[delCalls.length - 1]).toBe('OU=Marketing,DC=lab,DC=dev')
  })
})

describe('renameOu', () => {
  it('renames OU and returns new DN', async () => {
    const newDn = await renameOu(credentials, 'OU=Marketing,DC=lab,DC=dev', 'Sales')

    expect(newDn).toBe('OU=Sales,DC=lab,DC=dev')
    expect(mockClient.modifyDN).toHaveBeenCalledWith(
      'OU=Marketing,DC=lab,DC=dev',
      'OU=Sales,DC=lab,DC=dev',
    )
  })
})
