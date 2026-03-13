import { ChevronRight, FolderOpen, Folder, Database, Box, Loader2 } from 'lucide-react'
import type { TreeNode } from '@samba-ad/shared'
import { useTreeRoot, useTreeChildren } from '@/hooks/useTreeData'
import { useDirectoryStore } from '@/stores/directoryStore'
import { cn } from '@/lib/utils'

function NodeIcon({ type, isExpanded }: { type: TreeNode['type']; isExpanded: boolean }) {
  const className = 'h-4 w-4 shrink-0'

  switch (type) {
    case 'domain':
      return <Database className={cn(className, 'text-blue-600')} />
    case 'ou':
      return isExpanded
        ? <FolderOpen className={cn(className, 'text-amber-600')} />
        : <Folder className={cn(className, 'text-amber-600')} />
    case 'container':
    case 'builtinDomain':
      return <Box className={cn(className, 'text-slate-500')} />
    default:
      return <Folder className={className} />
  }
}

interface TreeNodeItemProps {
  node: TreeNode
  level: number
}

function TreeNodeItem({ node, level }: TreeNodeItemProps) {
  const { selectedNode, expandedNodes, selectNode, toggleNode } = useDirectoryStore()
  const isExpanded = expandedNodes.has(node.dn)
  const isSelected = selectedNode === node.dn

  const { data: children, isLoading } = useTreeChildren(node.dn, isExpanded && node.hasChildren)

  function handleSelect() {
    selectNode(node.dn)
    if (node.hasChildren) {
      toggleNode(node.dn)
    }
  }

  function handleChevronClick(e: React.MouseEvent) {
    e.stopPropagation()
    toggleNode(node.dn)
  }

  return (
    <div>
      <div
        className={cn(
          'flex cursor-pointer items-center gap-1 rounded-sm px-1 py-0.5 text-sm hover:bg-accent',
          isSelected && 'bg-accent font-medium',
        )}
        style={{ paddingLeft: `${level * 16 + 4}px` }}
        onClick={handleSelect}
      >
        {node.hasChildren ? (
          <button
            onClick={handleChevronClick}
            className="flex h-4 w-4 shrink-0 items-center justify-center"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            ) : (
              <ChevronRight
                className={cn(
                  'h-3 w-3 text-muted-foreground transition-transform',
                  isExpanded && 'rotate-90',
                )}
              />
            )}
          </button>
        ) : (
          <span className="h-4 w-4 shrink-0" />
        )}
        <NodeIcon type={node.type} isExpanded={isExpanded} />
        <span className="truncate">{node.name}</span>
      </div>
      {isExpanded && children && (
        <div>
          {children.map((child) => (
            <TreeNodeItem key={child.dn} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function DirectoryTree() {
  const { data: roots, isLoading, error } = useTreeRoot()

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        Failed to load directory tree.
      </div>
    )
  }

  if (!roots || roots.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No directory entries found.
      </div>
    )
  }

  return (
    <div>
      {roots.map((node) => (
        <TreeNodeItem key={node.dn} node={node} level={0} />
      ))}
    </div>
  )
}
