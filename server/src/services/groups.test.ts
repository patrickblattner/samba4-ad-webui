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

import { getGroup, createGroup, updateGroup, deleteGroup, addMembers, removeMembers, moveGroup } from './groups.js'
import { search, unbind } from './ldap.js'
import { GROUP_TYPE } from '@samba-ad/shared'

const credentials: Credentials = {
  dn: 'CN=Administrator,CN=Users,DC=lab,DC=dev',
  password: 'Admin1234!',
}

beforeEach(() => vi.clearAllMocks())

describe('getGroup', () => {
  it('returns mapped group when found', async () => {
    vi.mocked(search).mockResolvedValueOnce([{
      dn: 'CN=Domain Admins,CN=Users,DC=lab,DC=dev',
      sAMAccountName: 'Domain Admins',
      groupType: -2147483646,
      member: ['CN=Administrator,CN=Users,DC=lab,DC=dev'],
    } as any])

    const group = await getGroup(credentials, 'CN=Domain Admins,CN=Users,DC=lab,DC=dev')

    expect(group.dn).toBe('CN=Domain Admins,CN=Users,DC=lab,DC=dev')
    expect(group.sAMAccountName).toBe('Domain Admins')
    expect(group.member).toEqual(['CN=Administrator,CN=Users,DC=lab,DC=dev'])
  })

  it('throws 404 when group not found', async () => {
    vi.mocked(search).mockResolvedValueOnce([])

    await expect(getGroup(credentials, 'CN=NoGroup,DC=lab,DC=dev'))
      .rejects.toThrow('Group not found')
  })
})

describe('createGroup', () => {
  it('creates group with correct attributes', async () => {
    const dn = await createGroup(credentials, {
      name: 'TestGroup',
      sAMAccountName: 'TestGroup',
      groupType: GROUP_TYPE.GLOBAL | GROUP_TYPE.SECURITY,
      parentDn: 'CN=Users,DC=lab,DC=dev',
      description: 'Test group',
    })

    expect(dn).toBe('CN=TestGroup,CN=Users,DC=lab,DC=dev')
    expect(mockClient.add).toHaveBeenCalledWith(
      'CN=TestGroup,CN=Users,DC=lab,DC=dev',
      expect.objectContaining({
        objectClass: ['top', 'group'],
        sAMAccountName: 'TestGroup',
        description: 'Test group',
      }),
    )
  })
})

describe('updateGroup', () => {
  it('sends replace modifications for allowed attributes', async () => {
    await updateGroup(credentials, 'CN=TestGroup,DC=lab,DC=dev', {
      description: 'Updated description',
    })

    expect(mockClient.modify).toHaveBeenCalled()
  })

  it('filters out disallowed attributes', async () => {
    await updateGroup(credentials, 'CN=TestGroup,DC=lab,DC=dev', {
      description: 'Valid',
      objectClass: 'hacked',
    } as any)

    const modifications = mockClient.modify.mock.calls[0][1]
    expect(modifications).toHaveLength(1)
  })

  it('skips when no valid changes', async () => {
    await updateGroup(credentials, 'CN=TestGroup,DC=lab,DC=dev', {
      objectClass: 'hacked',
    } as any)

    expect(mockClient.modify).not.toHaveBeenCalled()
  })
})

describe('deleteGroup', () => {
  it('deletes by DN', async () => {
    await deleteGroup(credentials, 'CN=TestGroup,DC=lab,DC=dev')
    expect(mockClient.del).toHaveBeenCalledWith('CN=TestGroup,DC=lab,DC=dev')
  })
})

describe('addMembers', () => {
  it('adds member DNs to group', async () => {
    await addMembers(credentials, 'CN=TestGroup,DC=lab,DC=dev', [
      'CN=User1,DC=lab,DC=dev',
      'CN=User2,DC=lab,DC=dev',
    ])

    expect(mockClient.modify).toHaveBeenCalledWith(
      'CN=TestGroup,DC=lab,DC=dev',
      expect.arrayContaining([
        expect.objectContaining({ operation: 'add' }),
      ]),
    )
  })

  it('does nothing for empty member list', async () => {
    await addMembers(credentials, 'CN=TestGroup,DC=lab,DC=dev', [])
    expect(mockClient.modify).not.toHaveBeenCalled()
  })
})

describe('removeMembers', () => {
  it('removes member DNs from group', async () => {
    await removeMembers(credentials, 'CN=TestGroup,DC=lab,DC=dev', [
      'CN=User1,DC=lab,DC=dev',
    ])

    expect(mockClient.modify).toHaveBeenCalledWith(
      'CN=TestGroup,DC=lab,DC=dev',
      expect.arrayContaining([
        expect.objectContaining({ operation: 'delete' }),
      ]),
    )
  })

  it('does nothing for empty member list', async () => {
    await removeMembers(credentials, 'CN=TestGroup,DC=lab,DC=dev', [])
    expect(mockClient.modify).not.toHaveBeenCalled()
  })
})

describe('moveGroup', () => {
  it('moves group to new OU', async () => {
    const newDn = await moveGroup(credentials, 'CN=TestGroup,CN=Users,DC=lab,DC=dev', 'OU=Groups,DC=lab,DC=dev')

    expect(newDn).toBe('CN=TestGroup,OU=Groups,DC=lab,DC=dev')
    expect(mockClient.modifyDN).toHaveBeenCalledWith(
      'CN=TestGroup,CN=Users,DC=lab,DC=dev',
      'CN=TestGroup,OU=Groups,DC=lab,DC=dev',
    )
  })
})
