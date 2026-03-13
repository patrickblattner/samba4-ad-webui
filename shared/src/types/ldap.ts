export type LdapAttributeValue = string | string[] | Buffer | Buffer[]

export interface LdapAttribute {
  name: string
  values: string[]
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
