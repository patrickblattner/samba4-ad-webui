export type LdapAttributeValue = string | string[] | Buffer | Buffer[]

export type AttributeSyntaxType =
  | 'string'
  | 'integer'
  | 'largeInteger'
  | 'boolean'
  | 'dn'
  | 'octetString'
  | 'sid'
  | 'securityDescriptor'
  | 'generalizedTime'
  | 'dnBinary'
  | 'dnString'
  | 'numericString'

export interface LdapAttribute {
  name: string
  values: string[]
  isSingleValued?: boolean
  syntax?: AttributeSyntaxType
  isReadOnly?: boolean
}

export interface LdapEntry {
  dn: string
  attributes: LdapAttribute[]
}

export interface AttributeChange {
  name: string
  operation: 'replace' | 'add' | 'delete'
  values: string[]
}
