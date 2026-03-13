import type { ReactNode } from 'react'
import {
  UserPlus,
  Users,
  Monitor,
  FolderPlus,
  FolderMinus,
  RefreshCw,
  Settings,
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
  children: ReactNode
  onNewUser: () => void
  onNewGroup: () => void
  onNewComputer: () => void
  onNewOu: () => void
  onDeleteOu: () => void
  onRefresh: () => void
  onProperties?: () => void
}

export default function TreeContextMenu({
  children,
  onNewUser,
  onNewGroup,
  onNewComputer,
  onNewOu,
  onDeleteOu,
  onRefresh,
  onProperties,
}: TreeContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
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
        <ContextMenuItem onClick={onNewOu}>
          <FolderPlus className="mr-2 h-4 w-4" />
          New OU
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onDeleteOu} className="text-destructive focus:text-destructive">
          <FolderMinus className="mr-2 h-4 w-4" />
          Delete OU
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
          <ContextMenuShortcut>F5</ContextMenuShortcut>
        </ContextMenuItem>
        {onProperties && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onProperties}>
              <Settings className="mr-2 h-4 w-4" />
              Properties
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
