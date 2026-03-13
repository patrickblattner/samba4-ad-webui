import { UserPlus, Users, Monitor, Trash2, UserCheck, UserX, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface ObjectListToolbarProps {
  selectedType: string | null
  selectedEnabled: boolean | null
  onNewUser: () => void
  onNewGroup: () => void
  onNewComputer: () => void
  onDelete: () => void
  onEnable: () => void
  onDisable: () => void
  onResetPassword: () => void
}

export default function ObjectListToolbar({
  selectedType,
  selectedEnabled,
  onNewUser,
  onNewGroup,
  onNewComputer,
  onDelete,
  onEnable,
  onDisable,
  onResetPassword,
}: ObjectListToolbarProps) {
  const isUser = selectedType === 'user'
  const hasSelection = selectedType !== null

  return (
    <div className="flex items-center gap-1 border-b px-2 py-1">
      <Button variant="ghost" size="sm" onClick={onNewUser} title="New User">
        <UserPlus className="mr-1 h-4 w-4" />
        New User
      </Button>

      <Button variant="ghost" size="sm" onClick={onNewGroup} title="New Group">
        <Users className="mr-1 h-4 w-4" />
        New Group
      </Button>

      <Button variant="ghost" size="sm" onClick={onNewComputer} title="New Computer">
        <Monitor className="mr-1 h-4 w-4" />
        New Computer
      </Button>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Button
        variant="ghost"
        size="sm"
        disabled={!hasSelection}
        onClick={onDelete}
        title="Delete"
      >
        <Trash2 className="mr-1 h-4 w-4" />
        Delete
      </Button>

      {isUser && (
        <>
          <Separator orientation="vertical" className="mx-1 h-6" />

          <Button
            variant="ghost"
            size="sm"
            disabled={!isUser}
            onClick={onResetPassword}
            title="Reset Password"
          >
            <KeyRound className="mr-1 h-4 w-4" />
            Reset Password
          </Button>

          {selectedEnabled === false ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEnable}
              title="Enable Account"
            >
              <UserCheck className="mr-1 h-4 w-4" />
              Enable
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDisable}
              title="Disable Account"
            >
              <UserX className="mr-1 h-4 w-4" />
              Disable
            </Button>
          )}
        </>
      )}
    </div>
  )
}
