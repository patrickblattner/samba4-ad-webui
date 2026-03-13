export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: {
    dn: string
    displayName: string
    sAMAccountName: string
  }
}

export interface JwtPayload {
  dn: string
  sAMAccountName: string
  displayName: string
  encryptedCredentials: string
  iat?: number
  exp?: number
}
