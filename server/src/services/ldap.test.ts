import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockConfig = vi.hoisted(() => ({
  ldap: {
    url: 'ldap://localhost:389',
    ldapsUrl: 'ldaps://localhost:636',
    baseDn: 'DC=lab,DC=dev',
    tlsRejectUnauthorized: true,
    caCertPath: undefined as string | undefined,
  },
}))

vi.mock('../config.js', () => ({
  config: mockConfig,
}))

const mockReadFileSync = vi.hoisted(() => vi.fn())

vi.mock('fs', () => ({
  readFileSync: mockReadFileSync,
}))

const mockClientInstance = vi.hoisted(() => ({
  bind: vi.fn(),
  unbind: vi.fn(),
  search: vi.fn(),
}))

const MockClient = vi.hoisted(() =>
  vi.fn().mockImplementation(() => mockClientInstance),
)

vi.mock('ldapts', () => ({
  Client: MockClient,
}))

import { createClient } from './ldap.js'

beforeEach(() => {
  vi.clearAllMocks()
  mockConfig.ldap.tlsRejectUnauthorized = true
  mockConfig.ldap.caCertPath = undefined
})

describe('createClient', () => {
  it('sets rejectUnauthorized to true for ldaps when config is true', () => {
    mockConfig.ldap.tlsRejectUnauthorized = true

    createClient('ldaps://localhost:636')

    expect(MockClient).toHaveBeenCalledWith({
      url: 'ldaps://localhost:636',
      tlsOptions: {
        rejectUnauthorized: true,
      },
    })
  })

  it('sets rejectUnauthorized to false for ldaps when config is false', () => {
    mockConfig.ldap.tlsRejectUnauthorized = false

    createClient('ldaps://localhost:636')

    expect(MockClient).toHaveBeenCalledWith({
      url: 'ldaps://localhost:636',
      tlsOptions: {
        rejectUnauthorized: false,
      },
    })
  })

  it('does not set tlsOptions for non-TLS ldap URL', () => {
    createClient('ldap://localhost:389')

    expect(MockClient).toHaveBeenCalledWith({
      url: 'ldap://localhost:389',
    })
  })

  it('includes CA certificate when caCertPath is set', () => {
    mockConfig.ldap.caCertPath = '/etc/ssl/certs/my-ca.pem'
    const fakeCert = Buffer.from('-----BEGIN CERTIFICATE-----\nfake\n-----END CERTIFICATE-----')
    mockReadFileSync.mockReturnValue(fakeCert)

    createClient('ldaps://localhost:636')

    expect(mockReadFileSync).toHaveBeenCalledWith('/etc/ssl/certs/my-ca.pem')
    expect(MockClient).toHaveBeenCalledWith({
      url: 'ldaps://localhost:636',
      tlsOptions: {
        rejectUnauthorized: true,
        ca: [fakeCert],
      },
    })
  })

  it('does not include ca in tlsOptions when caCertPath is undefined', () => {
    mockConfig.ldap.caCertPath = undefined

    createClient('ldaps://localhost:636')

    expect(mockReadFileSync).not.toHaveBeenCalled()
    expect(MockClient).toHaveBeenCalledWith({
      url: 'ldaps://localhost:636',
      tlsOptions: {
        rejectUnauthorized: true,
      },
    })
  })
})
