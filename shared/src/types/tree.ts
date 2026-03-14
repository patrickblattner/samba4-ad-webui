export interface TreeNode {
  dn: string
  name: string
  type: 'domain' | 'ou' | 'container' | 'builtinDomain' | 'systemContainer'
  hasChildren: boolean
  children?: TreeNode[]
}
