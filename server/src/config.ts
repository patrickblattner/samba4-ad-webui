import dotenv from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../../.env') })

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  ldap: {
    url: process.env.LDAP_URL || 'ldap://localhost:389',
    ldapsUrl: process.env.LDAPS_URL || 'ldaps://localhost:636',
    baseDn: process.env.LDAP_BASE_DN || 'DC=lab,DC=dev',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiry: process.env.JWT_EXPIRY || '15m',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },

  crypto: {
    encryptionKey: process.env.CREDENTIAL_ENCRYPTION_KEY || '',
  },
}
