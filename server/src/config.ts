import dotenv from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../../.env') })

const isProduction = (process.env.NODE_ENV || 'development') === 'production'

const jwtSecret = process.env.JWT_SECRET || 'change-me-in-production'
const encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY || ''

if (isProduction) {
  if (jwtSecret === 'change-me-in-production') {
    console.error('FATAL: JWT_SECRET must be set in production. Do not use the default value.')
    process.exit(1)
  }
  if (!encryptionKey || encryptionKey.length < 32) {
    console.error('FATAL: CREDENTIAL_ENCRYPTION_KEY must be set and at least 32 characters in production.')
    process.exit(1)
  }
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  ldap: {
    url: process.env.LDAP_URL || 'ldap://localhost:389',
    ldapsUrl: process.env.LDAPS_URL || 'ldaps://localhost:636',
    baseDn: process.env.LDAP_BASE_DN || 'DC=lab,DC=dev',
  },

  jwt: {
    secret: jwtSecret,
    expiry: process.env.JWT_EXPIRY || '15m',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },

  crypto: {
    encryptionKey,
  },
}
