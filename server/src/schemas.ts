import { z } from 'zod'

// Auth
export const loginSchema = z.object({
  username: z.string().min(1, 'username is required').max(256, 'username must be at most 256 characters'),
  password: z.string().min(1, 'password is required').max(256, 'password must be at most 256 characters'),
})

export const refreshSchema = z.object({
  token: z.string().min(1, 'token is required').max(4096, 'token must be at most 4096 characters'),
})

// Users
export const createUserSchema = z.object({
  parentDn: z.string().min(1).max(2048, 'parentDn must be at most 2048 characters'),
  sAMAccountName: z.string().min(1).max(20, 'sAMAccountName must be at most 20 characters'),
  userPrincipalName: z.string().min(1).max(1024, 'userPrincipalName must be at most 1024 characters'),
  password: z.string().min(1).max(256, 'password must be at most 256 characters'),
  displayName: z.string().max(256, 'displayName must be at most 256 characters').optional(),
  givenName: z.string().max(256, 'givenName must be at most 256 characters').optional(),
  sn: z.string().max(256, 'sn must be at most 256 characters').optional(),
  description: z.string().max(1024, 'description must be at most 1024 characters').optional(),
}).passthrough()

export const passwordResetSchema = z.object({
  newPassword: z.string().min(1, 'newPassword is required').max(256, 'newPassword must be at most 256 characters'),
})

export const moveSchema = z.object({
  targetOu: z.string().min(1, 'targetOu is required').max(2048, 'targetOu must be at most 2048 characters'),
})

// Groups
export const createGroupSchema = z.object({
  parentDn: z.string().min(1).max(2048, 'parentDn must be at most 2048 characters'),
  name: z.string().min(1).max(256, 'name must be at most 256 characters'),
  sAMAccountName: z.string().min(1).max(256, 'sAMAccountName must be at most 256 characters'),
  groupType: z.number(),
  description: z.string().max(1024, 'description must be at most 1024 characters').optional(),
}).passthrough()

export const membersSchema = z.object({
  members: z.array(z.string().min(1).max(2048, 'member DN must be at most 2048 characters')).min(1, 'members must be a non-empty array'),
})

// Computers
export const createComputerSchema = z.object({
  parentDn: z.string().min(1).max(2048, 'parentDn must be at most 2048 characters'),
  name: z.string().min(1).max(256, 'name must be at most 256 characters'),
  sAMAccountName: z.string().min(1).max(256, 'sAMAccountName must be at most 256 characters'),
  description: z.string().max(1024, 'description must be at most 1024 characters').optional(),
}).passthrough()

// OUs
export const createOuSchema = z.object({
  name: z.string().min(1).max(256, 'name must be at most 256 characters'),
  parentDn: z.string().min(1).max(2048, 'parentDn must be at most 2048 characters'),
  description: z.string().max(1024, 'description must be at most 1024 characters').optional(),
})

export const renameOuSchema = z.object({
  newName: z.string().min(1, 'newName is required').max(256, 'newName must be at most 256 characters'),
})

// Attributes
export const updateAttributesSchema = z.object({
  changes: z.array(z.object({
    operation: z.enum(['replace', 'add', 'delete']),
    modification: z.object({
      type: z.string().min(1).max(256, 'attribute type must be at most 256 characters'),
      values: z.array(z.string().max(65536, 'attribute value must be at most 65536 characters')).optional(),
    }),
  })),
})
