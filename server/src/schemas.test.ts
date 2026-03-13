import { describe, it, expect } from 'vitest'
import {
  loginSchema,
  refreshSchema,
  createUserSchema,
  updateUserSchema,
  passwordResetSchema,
  moveSchema,
  createGroupSchema,
  updateGroupSchema,
  membersSchema,
  createComputerSchema,
  updateComputerSchema,
  createOuSchema,
  updateOuSchema,
  renameOuSchema,
  updateAttributesSchema,
} from './schemas'

describe('loginSchema', () => {
  it('accepts valid payload at max boundary', () => {
    const result = loginSchema.safeParse({
      username: 'a'.repeat(256),
      password: 'b'.repeat(256),
    })
    expect(result.success).toBe(true)
  })

  it('rejects username exceeding max length', () => {
    const result = loginSchema.safeParse({
      username: 'a'.repeat(257),
      password: 'valid',
    })
    expect(result.success).toBe(false)
  })

  it('rejects password exceeding max length', () => {
    const result = loginSchema.safeParse({
      username: 'valid',
      password: 'b'.repeat(257),
    })
    expect(result.success).toBe(false)
  })
})

describe('refreshSchema', () => {
  it('accepts token at max boundary', () => {
    const result = refreshSchema.safeParse({ token: 'a'.repeat(4096) })
    expect(result.success).toBe(true)
  })

  it('rejects token exceeding max length', () => {
    const result = refreshSchema.safeParse({ token: 'a'.repeat(4097) })
    expect(result.success).toBe(false)
  })
})

describe('createUserSchema', () => {
  const validPayload = {
    parentDn: 'OU=Users,DC=example,DC=com',
    sAMAccountName: 'jdoe',
    userPrincipalName: 'jdoe@example.com',
    password: 'P@ssw0rd',
  }

  it('accepts valid payload at max boundaries', () => {
    const result = createUserSchema.safeParse({
      parentDn: 'a'.repeat(2048),
      sAMAccountName: 'a'.repeat(20),
      userPrincipalName: 'a'.repeat(1024),
      password: 'a'.repeat(256),
      displayName: 'a'.repeat(256),
      givenName: 'a'.repeat(256),
      sn: 'a'.repeat(256),
      description: 'a'.repeat(1024),
    })
    expect(result.success).toBe(true)
  })

  it('rejects parentDn exceeding max length', () => {
    const result = createUserSchema.safeParse({
      ...validPayload,
      parentDn: 'a'.repeat(2049),
    })
    expect(result.success).toBe(false)
  })

  it('rejects sAMAccountName exceeding 20 characters', () => {
    const result = createUserSchema.safeParse({
      ...validPayload,
      sAMAccountName: 'a'.repeat(21),
    })
    expect(result.success).toBe(false)
  })

  it('rejects userPrincipalName exceeding max length', () => {
    const result = createUserSchema.safeParse({
      ...validPayload,
      userPrincipalName: 'a'.repeat(1025),
    })
    expect(result.success).toBe(false)
  })

  it('rejects password exceeding max length', () => {
    const result = createUserSchema.safeParse({
      ...validPayload,
      password: 'a'.repeat(257),
    })
    expect(result.success).toBe(false)
  })

  it('rejects displayName exceeding max length', () => {
    const result = createUserSchema.safeParse({
      ...validPayload,
      displayName: 'a'.repeat(257),
    })
    expect(result.success).toBe(false)
  })

  it('rejects givenName exceeding max length', () => {
    const result = createUserSchema.safeParse({
      ...validPayload,
      givenName: 'a'.repeat(257),
    })
    expect(result.success).toBe(false)
  })

  it('rejects sn exceeding max length', () => {
    const result = createUserSchema.safeParse({
      ...validPayload,
      sn: 'a'.repeat(257),
    })
    expect(result.success).toBe(false)
  })

  it('rejects description exceeding max length', () => {
    const result = createUserSchema.safeParse({
      ...validPayload,
      description: 'a'.repeat(1025),
    })
    expect(result.success).toBe(false)
  })
})

describe('passwordResetSchema', () => {
  it('accepts newPassword at max boundary', () => {
    const result = passwordResetSchema.safeParse({ newPassword: 'a'.repeat(256) })
    expect(result.success).toBe(true)
  })

  it('rejects newPassword exceeding max length', () => {
    const result = passwordResetSchema.safeParse({ newPassword: 'a'.repeat(257) })
    expect(result.success).toBe(false)
  })
})

describe('moveSchema', () => {
  it('accepts targetOu at max boundary', () => {
    const result = moveSchema.safeParse({ targetOu: 'a'.repeat(2048) })
    expect(result.success).toBe(true)
  })

  it('rejects targetOu exceeding max length', () => {
    const result = moveSchema.safeParse({ targetOu: 'a'.repeat(2049) })
    expect(result.success).toBe(false)
  })
})

describe('createGroupSchema', () => {
  const validPayload = {
    parentDn: 'OU=Groups,DC=example,DC=com',
    name: 'TestGroup',
    sAMAccountName: 'TestGroup',
    groupType: -2147483646,
  }

  it('accepts valid payload at max boundaries', () => {
    const result = createGroupSchema.safeParse({
      parentDn: 'a'.repeat(2048),
      name: 'a'.repeat(256),
      sAMAccountName: 'a'.repeat(256),
      groupType: -2147483646,
      description: 'a'.repeat(1024),
    })
    expect(result.success).toBe(true)
  })

  it('rejects parentDn exceeding max length', () => {
    const result = createGroupSchema.safeParse({
      ...validPayload,
      parentDn: 'a'.repeat(2049),
    })
    expect(result.success).toBe(false)
  })

  it('rejects name exceeding max length', () => {
    const result = createGroupSchema.safeParse({
      ...validPayload,
      name: 'a'.repeat(257),
    })
    expect(result.success).toBe(false)
  })

  it('rejects sAMAccountName exceeding max length', () => {
    const result = createGroupSchema.safeParse({
      ...validPayload,
      sAMAccountName: 'a'.repeat(257),
    })
    expect(result.success).toBe(false)
  })

  it('rejects description exceeding max length', () => {
    const result = createGroupSchema.safeParse({
      ...validPayload,
      description: 'a'.repeat(1025),
    })
    expect(result.success).toBe(false)
  })
})

describe('membersSchema', () => {
  it('accepts member DNs at max boundary', () => {
    const result = membersSchema.safeParse({
      members: ['a'.repeat(2048)],
    })
    expect(result.success).toBe(true)
  })

  it('rejects member DN exceeding max length', () => {
    const result = membersSchema.safeParse({
      members: ['a'.repeat(2049)],
    })
    expect(result.success).toBe(false)
  })
})

describe('createComputerSchema', () => {
  const validPayload = {
    parentDn: 'OU=Computers,DC=example,DC=com',
    name: 'WORKSTATION1',
    sAMAccountName: 'WORKSTATION1$',
  }

  it('accepts valid payload at max boundaries', () => {
    const result = createComputerSchema.safeParse({
      parentDn: 'a'.repeat(2048),
      name: 'a'.repeat(256),
      sAMAccountName: 'a'.repeat(256),
      description: 'a'.repeat(1024),
    })
    expect(result.success).toBe(true)
  })

  it('rejects parentDn exceeding max length', () => {
    const result = createComputerSchema.safeParse({
      ...validPayload,
      parentDn: 'a'.repeat(2049),
    })
    expect(result.success).toBe(false)
  })

  it('rejects name exceeding max length', () => {
    const result = createComputerSchema.safeParse({
      ...validPayload,
      name: 'a'.repeat(257),
    })
    expect(result.success).toBe(false)
  })

  it('rejects sAMAccountName exceeding max length', () => {
    const result = createComputerSchema.safeParse({
      ...validPayload,
      sAMAccountName: 'a'.repeat(257),
    })
    expect(result.success).toBe(false)
  })

  it('rejects description exceeding max length', () => {
    const result = createComputerSchema.safeParse({
      ...validPayload,
      description: 'a'.repeat(1025),
    })
    expect(result.success).toBe(false)
  })
})

describe('createOuSchema', () => {
  it('accepts valid payload at max boundaries', () => {
    const result = createOuSchema.safeParse({
      name: 'a'.repeat(256),
      parentDn: 'a'.repeat(2048),
      description: 'a'.repeat(1024),
    })
    expect(result.success).toBe(true)
  })

  it('rejects name exceeding max length', () => {
    const result = createOuSchema.safeParse({
      name: 'a'.repeat(257),
      parentDn: 'OU=Test,DC=example,DC=com',
    })
    expect(result.success).toBe(false)
  })

  it('rejects parentDn exceeding max length', () => {
    const result = createOuSchema.safeParse({
      name: 'TestOU',
      parentDn: 'a'.repeat(2049),
    })
    expect(result.success).toBe(false)
  })

  it('rejects description exceeding max length', () => {
    const result = createOuSchema.safeParse({
      name: 'TestOU',
      parentDn: 'OU=Test,DC=example,DC=com',
      description: 'a'.repeat(1025),
    })
    expect(result.success).toBe(false)
  })
})

describe('renameOuSchema', () => {
  it('accepts newName at max boundary', () => {
    const result = renameOuSchema.safeParse({ newName: 'a'.repeat(256) })
    expect(result.success).toBe(true)
  })

  it('rejects newName exceeding max length', () => {
    const result = renameOuSchema.safeParse({ newName: 'a'.repeat(257) })
    expect(result.success).toBe(false)
  })
})

describe('createUserSchema catchall', () => {
  const validPayload = {
    parentDn: 'OU=Users,DC=example,DC=com',
    sAMAccountName: 'jdoe',
    userPrincipalName: 'jdoe@example.com',
    password: 'P@ssw0rd',
  }

  it('allows extra string attributes within 65536 chars', () => {
    const result = createUserSchema.safeParse({
      ...validPayload,
      customAttr: 'a'.repeat(65536),
    })
    expect(result.success).toBe(true)
  })

  it('rejects extra attributes exceeding 65536 chars', () => {
    const result = createUserSchema.safeParse({
      ...validPayload,
      customAttr: 'a'.repeat(65537),
    })
    expect(result.success).toBe(false)
  })

  it('rejects extra attributes that are not strings', () => {
    const result = createUserSchema.safeParse({
      ...validPayload,
      customAttr: 12345,
    })
    expect(result.success).toBe(false)
  })
})

describe('createGroupSchema catchall', () => {
  const validPayload = {
    parentDn: 'OU=Groups,DC=example,DC=com',
    name: 'TestGroup',
    sAMAccountName: 'TestGroup',
    groupType: -2147483646,
  }

  it('allows extra string attributes within 65536 chars', () => {
    const result = createGroupSchema.safeParse({
      ...validPayload,
      customAttr: 'a'.repeat(65536),
    })
    expect(result.success).toBe(true)
  })

  it('rejects extra attributes exceeding 65536 chars', () => {
    const result = createGroupSchema.safeParse({
      ...validPayload,
      customAttr: 'a'.repeat(65537),
    })
    expect(result.success).toBe(false)
  })
})

describe('createComputerSchema catchall', () => {
  const validPayload = {
    parentDn: 'OU=Computers,DC=example,DC=com',
    name: 'WORKSTATION1',
    sAMAccountName: 'WORKSTATION1$',
  }

  it('allows extra string attributes within 65536 chars', () => {
    const result = createComputerSchema.safeParse({
      ...validPayload,
      customAttr: 'a'.repeat(65536),
    })
    expect(result.success).toBe(true)
  })

  it('rejects extra attributes exceeding 65536 chars', () => {
    const result = createComputerSchema.safeParse({
      ...validPayload,
      customAttr: 'a'.repeat(65537),
    })
    expect(result.success).toBe(false)
  })
})

describe('updateUserSchema', () => {
  it('accepts valid partial update', () => {
    const result = updateUserSchema.safeParse({
      givenName: 'John',
      title: 'Manager',
    })
    expect(result.success).toBe(true)
  })

  it('accepts null values for attribute deletion', () => {
    const result = updateUserSchema.safeParse({
      givenName: null,
      title: null,
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty body', () => {
    const result = updateUserSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects unknown fields', () => {
    const result = updateUserSchema.safeParse({
      givenName: 'John',
      objectClass: 'hacked',
    })
    expect(result.success).toBe(false)
  })

  it('rejects sAMAccountName exceeding 20 characters', () => {
    const result = updateUserSchema.safeParse({
      sAMAccountName: 'a'.repeat(21),
    })
    expect(result.success).toBe(false)
  })
})

describe('updateGroupSchema', () => {
  it('accepts valid partial update', () => {
    const result = updateGroupSchema.safeParse({
      description: 'Updated description',
    })
    expect(result.success).toBe(true)
  })

  it('accepts null values for attribute deletion', () => {
    const result = updateGroupSchema.safeParse({
      description: null,
      mail: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects unknown fields', () => {
    const result = updateGroupSchema.safeParse({
      description: 'Valid',
      objectClass: 'hacked',
    })
    expect(result.success).toBe(false)
  })
})

describe('updateComputerSchema', () => {
  it('accepts valid partial update', () => {
    const result = updateComputerSchema.safeParse({
      description: 'Updated description',
    })
    expect(result.success).toBe(true)
  })

  it('accepts null values for attribute deletion', () => {
    const result = updateComputerSchema.safeParse({
      description: null,
      location: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects unknown fields', () => {
    const result = updateComputerSchema.safeParse({
      description: 'Valid',
      objectClass: 'hacked',
    })
    expect(result.success).toBe(false)
  })
})

describe('updateOuSchema', () => {
  it('accepts valid update', () => {
    const result = updateOuSchema.safeParse({
      description: 'Updated description',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty body', () => {
    const result = updateOuSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects description exceeding max length', () => {
    const result = updateOuSchema.safeParse({
      description: 'a'.repeat(1025),
    })
    expect(result.success).toBe(false)
  })

  it('rejects unknown fields', () => {
    const result = updateOuSchema.safeParse({
      description: 'Valid',
      objectClass: 'hacked',
    })
    expect(result.success).toBe(false)
  })
})

describe('updateAttributesSchema', () => {
  it('accepts valid payload at max boundaries', () => {
    const result = updateAttributesSchema.safeParse({
      changes: [{
        operation: 'replace',
        modification: {
          type: 'a'.repeat(256),
          values: ['a'.repeat(65536)],
        },
      }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects attribute type exceeding max length', () => {
    const result = updateAttributesSchema.safeParse({
      changes: [{
        operation: 'replace',
        modification: {
          type: 'a'.repeat(257),
          values: ['test'],
        },
      }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects attribute value exceeding max length', () => {
    const result = updateAttributesSchema.safeParse({
      changes: [{
        operation: 'replace',
        modification: {
          type: 'description',
          values: ['a'.repeat(65537)],
        },
      }],
    })
    expect(result.success).toBe(false)
  })
})
