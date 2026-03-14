import type { ReactNode } from 'react'
import type { TreeNode } from '@samba-ad/shared'
import {
  UserPlus,
  Users,
  Monitor,
  FolderPlus,
  Trash2,
  RefreshCw,
  Settings,
  Pencil,
  FolderInput,
} from 'lucide-react'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from '@/components/ui/context-menu'

interface TreeContextMenuProps {
  nodeType: TreeNode['type']
  children: ReactNode
  onNewUser: () => void
  onNewGroup: () => void
  onNewComputer: () => void
  onNewOu: () => void
  onDeleteOu: () => void
  onRefresh: () => void
  onRename?: () => void
  onMove?: () => void
  onProperties?: () => void
}

export default function TreeContextMenu({
  nodeType,
  children,
  onNewUser,
  onNewGroup,
  onNewComputer,
  onNewOu,
  onDeleteOu,
  onRefresh,
  onRename,
  onMove,
  onProperties,
}: TreeContextMenuProps) {
  const isOu = nodeType === 'ou'
  const isDomain = nodeType === 'domain'
  const canCreate = isOu || isDomain

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        {isOu && (
          <>
            <ContextMenuItem onClick={onNewUser}>
              <UserPlus className="mr-2 h-4 w-4" />
              New User
            </ContextMenuItem>
            <ContextMenuItem onClick={onNewGroup}>
              <Users className="mr-2 h-4 w-4" />
              New Group
            </ContextMenuItem>
            <ContextMenuItem onClick={onNewComputer}>
              <Monitor className="mr-2 h-4 w-4" />
              New Computer
            </ContextMenuItem>
          </>
        )}
        {canCreate && (
          <ContextMenuItem onClick={onNewOu}>
            <FolderPlus className="mr-2 h-4 w-4" />
            New OU
          </ContextMenuItem>
        )}

        {isOu && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onRename}>
              <Pencil className="mr-2 h-4 w-4" />
              Rename
            </ContextMenuItem>
            <ContextMenuItem onClick={onMove}>
              <FolderInput className="mr-2 h-4 w-4" />
              Move...
            </ContextMenuItem>
            <ContextMenuItem onClick={onProperties}>
              <Settings className="mr-2 h-4 w-4" />
              Properties
            </ContextMenuItem>
          </>
        )}

        {isOu && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onDeleteOu} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete OU
            </ContextMenuItem>
          </>
        )}

        <ContextMenuSeparator />
        <ContextMenuItem onClick={onRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
          <ContextMenuShortcut>F5</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
