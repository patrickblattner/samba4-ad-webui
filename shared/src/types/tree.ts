export interface TreeNode {
  dn: string
  name: string
  type: 'domain' | 'ou' | 'container' | 'builtinDomain'
  hasChildren: boolean
  children?: TreeNode[]
}
