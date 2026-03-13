import { useState, useEffect } from 'react'
import { ChevronRight, FolderOpen, Folder, Database, Loader2 } from 'lucide-react'
import type { TreeNode } from '@samba-ad/shared'
import { useTreeRoot, useTreeChildren } from '@/hooks/useTreeData'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface MoveObjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  objectName: string
  objectDn: string
  onMove: (targetOu: string) => void
  isPending?: boolean
}

function NodeIcon({ type, isExpanded }: { type: TreeNode['type']; isExpanded: boolean }) {
  const className = 'h-4 w-4 shrink-0'
  switch (type) {
    case 'domain':
      return <Database className={cn(className, 'text-blue-600')} />
    case 'ou':
    case 'container':
    case 'builtinDomain':
      return isExpanded
        ? <FolderOpen className={cn(className, 'text-amber-600')} />
        : <Folder className={cn(className, 'text-amber-600')} />
    default:
      return <Folder className={className} />
  }
}

interface OuTreeNodeProps {
  node: TreeNode
  level: number
  selectedDn: string | null
  expandedNodes: Set<string>
  onSelect: (dn: string) => void
  onToggle: (dn: string) => void
}

function OuTreeNode({ node, level, selectedDn, expandedNodes, onSelect, onToggle }: OuTreeNodeProps) {
  const isExpanded = expandedNodes.has(node.dn)
  const isSelected = selectedDn === node.dn
  const { data: children, isLoading } = useTreeChildren(node.dn, isExpanded && node.hasChildren)

  return (
    <div>
      <div
        className={cn(
          'flex cursor-pointer items-center gap-1 rounded-sm px-1 py-0.5 text-sm hover:bg-accent',
          isSelected && 'bg-accent font-medium ring-1 ring-ring',
        )}
        style={{ paddingLeft: `${level * 16 + 4}px` }}
        onClick={() => onSelect(node.dn)}
      >
        {node.hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggle(node.dn)
            }}
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
            <OuTreeNode
              key={child.dn}
              node={child}
              level={level + 1}
              selectedDn={selectedDn}
              expandedNodes={expandedNodes}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function MoveObjectDialog({
  open,
  onOpenChange,
  objectName,
  objectDn,
  onMove,
  isPending = false,
}: MoveObjectDialogProps) {
  const { data: roots, isLoading } = useTreeRoot()
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) {
      setSelectedTarget(null)
    }
  }, [open])

  function handleToggle(dn: string) {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(dn)) {
        next.delete(dn)
      } else {
        next.add(dn)
      }
      return next
    })
  }

  // Get current parent DN for disabling "move to same location"
  const currentParent = objectDn.indexOf(',') !== -1 ? objectDn.substring(objectDn.indexOf(',') + 1) : ''
  const canMove = selectedTarget !== null && selectedTarget !== currentParent

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Move Object</DialogTitle>
          <DialogDescription>
            Select the target container for &quot;{objectName}&quot;.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[300px] rounded-md border p-2">
          {isLoading && (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          )}
          {roots && roots.map((node) => (
            <OuTreeNode
              key={node.dn}
              node={node}
              level={0}
              selectedDn={selectedTarget}
              expandedNodes={expandedNodes}
              onSelect={setSelectedTarget}
              onToggle={handleToggle}
            />
          ))}
        </ScrollArea>

        {selectedTarget && (
          <p className="text-xs text-muted-foreground truncate">
            Target: {selectedTarget}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => selectedTarget && onMove(selectedTarget)} disabled={!canMove || isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
