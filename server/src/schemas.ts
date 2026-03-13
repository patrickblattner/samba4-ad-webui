import { z } from 'zod'

// Auth
export const loginSchema = z.object({
  username: z.string().min(1, 'username is required'),
  password: z.string().min(1, 'password is required'),
})

export const refreshSchema = z.object({
  token: z.string().min(1, 'token is required'),
})

// Users
export const createUserSchema = z.object({
  parentDn: z.string().min(1),
  sAMAccountName: z.string().min(1),
  userPrincipalName: z.string().min(1),
  password: z.string().min(1),
  displayName: z.string().optional(),
  givenName: z.string().optional(),
  sn: z.string().optional(),
  description: z.string().optional(),
}).passthrough()

export const passwordResetSchema = z.object({
  newPassword: z.string().min(1, 'newPassword is required'),
})

export const moveSchema = z.object({
  targetOu: z.string().min(1, 'targetOu is required'),
})

// Groups
export const createGroupSchema = z.object({
  parentDn: z.string().min(1),
  name: z.string().min(1),
  sAMAccountName: z.string().min(1),
  groupType: z.number(),
  description: z.string().optional(),
}).passthrough()

export const membersSchema = z.object({
  members: z.array(z.string().min(1)).min(1, 'members must be a non-empty array'),
})

// Computers
export const createComputerSchema = z.object({
  parentDn: z.string().min(1),
  name: z.string().min(1),
  sAMAccountName: z.string().min(1),
  description: z.string().optional(),
}).passthrough()

// OUs
export const createOuSchema = z.object({
  name: z.string().min(1),
  parentDn: z.string().min(1),
  description: z.string().optional(),
})

export const renameOuSchema = z.object({
  newName: z.string().min(1, 'newName is required'),
})

// Attributes
export const updateAttributesSchema = z.object({
  changes: z.array(z.object({
    operation: z.enum(['replace', 'add', 'delete']),
    modification: z.object({
      type: z.string().min(1),
      values: z.array(z.string()).optional(),
    }),
  })),
})
