import type { ReactNode } from 'react'
import {
  Settings,
  Trash2,
  KeyRound,
  UserCheck,
  UserX,
  Copy,
  MoveRight,
} from 'lucide-react'
import type { ObjectSummary } from '@samba-ad/shared'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from '@/components/ui/context-menu'

interface ObjectContextMenuProps {
  children: ReactNode
  object: ObjectSummary
  onProperties: () => void
  onDelete: () => void
  onResetPassword?: () => void
  onEnable?: () => void
  onDisable?: () => void
  onMove?: () => void
  onCopyDn: () => void
}

export default function ObjectContextMenu({
  children,
  object,
  onProperties,
  onDelete,
  onResetPassword,
  onEnable,
  onDisable,
  onMove,
  onCopyDn,
}: ObjectContextMenuProps) {
  const isUser = object.type === 'user'

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem onClick={onProperties}>
          <Settings className="mr-2 h-4 w-4" />
          Properties
          <ContextMenuShortcut>Enter</ContextMenuShortcut>
        </ContextMenuItem>

        {isUser && onResetPassword && (
          <ContextMenuItem onClick={onResetPassword}>
            <KeyRound className="mr-2 h-4 w-4" />
            Reset Password
          </ContextMenuItem>
        )}

        {isUser && object.enabled === false && onEnable && (
          <ContextMenuItem onClick={onEnable}>
            <UserCheck className="mr-2 h-4 w-4" />
            Enable Account
          </ContextMenuItem>
        )}

        {isUser && object.enabled !== false && onDisable && (
          <ContextMenuItem onClick={onDisable}>
            <UserX className="mr-2 h-4 w-4" />
            Disable Account
          </ContextMenuItem>
        )}

        {onMove && (
          <ContextMenuItem onClick={onMove}>
            <MoveRight className="mr-2 h-4 w-4" />
            Move...
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onCopyDn}>
          <Copy className="mr-2 h-4 w-4" />
          Copy DN
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
          <ContextMenuShortcut>Del</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
