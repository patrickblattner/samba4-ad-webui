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
    ldap: {
      url: 'ldap://localhost:389',
      ldapsUrl: 'ldaps://localhost:636',
      baseDn: 'DC=lab,DC=dev',
    },
  },
}))

import { getUser, createUser, updateUser, deleteUser, resetPassword, enableUser, disableUser, moveUser } from './users.js'
import { search, unbind } from './ldap.js'
import { UAC_FLAGS } from '@samba-ad/shared'

const credentials: Credentials = {
  dn: 'CN=Administrator,CN=Users,DC=lab,DC=dev',
  password: 'Admin1234!',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getUser', () => {
  it('returns mapped user when found', async () => {
    vi.mocked(search).mockResolvedValueOnce([{
      dn: 'CN=John Doe,CN=Users,DC=lab,DC=dev',
      sAMAccountName: 'jdoe',
      givenName: 'John',
      sn: 'Doe',
      displayName: 'John Doe',
      userAccountControl: 512,
      memberOf: ['CN=Domain Users,CN=Users,DC=lab,DC=dev'],
    } as any])

    const user = await getUser(credentials, 'CN=John Doe,CN=Users,DC=lab,DC=dev')

    expect(user.dn).toBe('CN=John Doe,CN=Users,DC=lab,DC=dev')
    expect(user.sAMAccountName).toBe('jdoe')
    expect(user.givenName).toBe('John')
    expect(user.sn).toBe('Doe')
    expect(user.displayName).toBe('John Doe')
    expect(user.userAccountControl).toBe(512)
    expect(unbind).toHaveBeenCalled()
  })

  it('throws 404 when user not found', async () => {
    vi.mocked(search).mockResolvedValueOnce([])

    await expect(getUser(credentials, 'CN=Nobody,DC=lab,DC=dev'))
      .rejects.toThrow('User not found')
  })
})

describe('createUser', () => {
  it('creates user, sets password, and enables account', async () => {
    // Mock resetPassword's search (via getUser in enableUser)
    vi.mocked(search)
      .mockResolvedValueOnce([{
        dn: 'CN=New User,CN=Users,DC=lab,DC=dev',
        sAMAccountName: 'newuser',
        userAccountControl: UAC_FLAGS.NORMAL_ACCOUNT | UAC_FLAGS.ACCOUNTDISABLE,
      } as any])

    const dn = await createUser(credentials, {
      sAMAccountName: 'newuser',
      userPrincipalName: 'newuser@lab.dev',
      password: 'Test1234!',
      parentDn: 'CN=Users,DC=lab,DC=dev',
      displayName: 'New User',
    })

    expect(dn).toBe('CN=New User,CN=Users,DC=lab,DC=dev')
    expect(mockClient.add).toHaveBeenCalledWith(
      'CN=New User,CN=Users,DC=lab,DC=dev',
      expect.objectContaining({
        objectClass: ['top', 'person', 'organizationalPerson', 'user'],
        sAMAccountName: 'newuser',
      }),
    )
  })

  it('cleans up user if password set fails', async () => {
    // Make resetPassword fail (it calls createBoundClient + modify)
    mockClient.modify.mockRejectedValueOnce(new Error('Password policy violation'))

    await expect(createUser(credentials, {
      sAMAccountName: 'failuser',
      userPrincipalName: 'failuser@lab.dev',
      password: 'weak',
      parentDn: 'CN=Users,DC=lab,DC=dev',
    })).rejects.toThrow('Failed to set password')

    // Should have tried to delete the created user
    expect(mockClient.del).toHaveBeenCalled()
  })
})

describe('updateUser', () => {
  it('sends replace modifications for allowed attributes', async () => {
    await updateUser(credentials, 'CN=John,DC=lab,DC=dev', {
      givenName: 'Jonathan',
      title: 'Manager',
    })

    expect(mockClient.modify).toHaveBeenCalledWith(
      'CN=John,DC=lab,DC=dev',
      expect.arrayContaining([
        expect.objectContaining({ operation: 'replace' }),
      ]),
    )
  })

  it('sends delete modification for null values', async () => {
    await updateUser(credentials, 'CN=John,DC=lab,DC=dev', {
      title: null as any,
    })

    expect(mockClient.modify).toHaveBeenCalledWith(
      'CN=John,DC=lab,DC=dev',
      expect.arrayContaining([
        expect.objectContaining({ operation: 'delete' }),
      ]),
    )
  })

  it('skips undefined values', async () => {
    await updateUser(credentials, 'CN=John,DC=lab,DC=dev', {
      givenName: undefined,
    } as any)

    // No modifications → modify should not be called
    expect(mockClient.modify).not.toHaveBeenCalled()
  })

  it('filters out disallowed attributes', async () => {
    await updateUser(credentials, 'CN=John,DC=lab,DC=dev', {
      givenName: 'John',
      objectClass: 'hacked',  // not allowed
    } as any)

    // Should only have 1 modification (givenName), not 2
    expect(mockClient.modify).toHaveBeenCalledWith(
      'CN=John,DC=lab,DC=dev',
      expect.any(Array),
    )
    const modifications = mockClient.modify.mock.calls[0][1]
    expect(modifications).toHaveLength(1)
  })
})

describe('deleteUser', () => {
  it('deletes by DN', async () => {
    await deleteUser(credentials, 'CN=John,DC=lab,DC=dev')

    expect(mockClient.del).toHaveBeenCalledWith('CN=John,DC=lab,DC=dev')
    expect(unbind).toHaveBeenCalled()
  })

  it('wraps LDAP errors', async () => {
    mockClient.del.mockRejectedValueOnce(new Error('No such object'))

    await expect(deleteUser(credentials, 'CN=Nobody,DC=lab,DC=dev'))
      .rejects.toThrow('Failed to delete user')
  })
})

describe('enableUser', () => {
  it('clears ACCOUNTDISABLE flag', async () => {
    vi.mocked(search).mockResolvedValueOnce([{
      dn: 'CN=John,DC=lab,DC=dev',
      sAMAccountName: 'john',
      userAccountControl: UAC_FLAGS.NORMAL_ACCOUNT | UAC_FLAGS.ACCOUNTDISABLE,
    } as any])

    await enableUser(credentials, 'CN=John,DC=lab,DC=dev')

    expect(mockClient.modify).toHaveBeenCalledWith(
      'CN=John,DC=lab,DC=dev',
      expect.arrayContaining([
        expect.objectContaining({ operation: 'replace' }),
      ]),
    )
  })

  it('does nothing if already enabled', async () => {
    vi.mocked(search).mockResolvedValueOnce([{
      dn: 'CN=John,DC=lab,DC=dev',
      sAMAccountName: 'john',
      userAccountControl: UAC_FLAGS.NORMAL_ACCOUNT,
    } as any])

    await enableUser(credentials, 'CN=John,DC=lab,DC=dev')

    expect(mockClient.modify).not.toHaveBeenCalled()
  })
})

describe('disableUser', () => {
  it('sets ACCOUNTDISABLE flag', async () => {
    vi.mocked(search).mockResolvedValueOnce([{
      dn: 'CN=John,DC=lab,DC=dev',
      sAMAccountName: 'john',
      userAccountControl: UAC_FLAGS.NORMAL_ACCOUNT,
    } as any])

    await disableUser(credentials, 'CN=John,DC=lab,DC=dev')

    expect(mockClient.modify).toHaveBeenCalled()
  })

  it('does nothing if already disabled', async () => {
    vi.mocked(search).mockResolvedValueOnce([{
      dn: 'CN=John,DC=lab,DC=dev',
      sAMAccountName: 'john',
      userAccountControl: UAC_FLAGS.NORMAL_ACCOUNT | UAC_FLAGS.ACCOUNTDISABLE,
    } as any])

    await disableUser(credentials, 'CN=John,DC=lab,DC=dev')

    expect(mockClient.modify).not.toHaveBeenCalled()
  })
})

describe('moveUser', () => {
  it('calls modifyDN with new DN', async () => {
    const newDn = await moveUser(credentials, 'CN=John,CN=Users,DC=lab,DC=dev', 'OU=Employees,DC=lab,DC=dev')

    expect(newDn).toBe('CN=John,OU=Employees,DC=lab,DC=dev')
    expect(mockClient.modifyDN).toHaveBeenCalledWith(
      'CN=John,CN=Users,DC=lab,DC=dev',
      'CN=John,OU=Employees,DC=lab,DC=dev',
    )
  })
})
