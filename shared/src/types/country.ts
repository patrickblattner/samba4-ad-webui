/** Country entry mapping ISO 3166 codes for AD country fields (c, co, countryCode) */
export interface CountryEntry {
  /** ISO 3166-1 alpha-2 code (c) */
  code: string
  /** Country name (co) */
  name: string
  /** ISO 3166-1 numeric code (countryCode) */
  numericCode: number
}
