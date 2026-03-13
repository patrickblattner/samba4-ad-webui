/**
 * LDAP filter builders for tree and object queries.
 */

/**
 * Filter to find OUs, containers, and builtinDomain objects
 * (used for building the tree view).
 */
export const treeChildrenFilter = (): string =>
  '(|(objectClass=organizationalUnit)(objectClass=container)(objectClass=builtinDomain))'

/**
 * Filter to list AD objects of a given type.
 * @param type - 'user', 'group', 'computer', or 'all' (default)
 */
export const objectListFilter = (type: string = 'all'): string => {
  switch (type) {
    case 'user':
      return '(&(objectClass=user)(objectCategory=person))'
    case 'group':
      return '(objectClass=group)'
    case 'computer':
      return '(objectClass=computer)'
    case 'all':
    default:
      return '(|(&(objectClass=user)(objectCategory=person))(objectClass=group)(objectClass=computer))'
  }
}
