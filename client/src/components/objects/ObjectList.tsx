import { useState } from 'react'
import { User, Users, Monitor, HelpCircle, Mail, Loader2 } from 'lucide-react'
import type { ObjectSummary } from '@samba-ad/shared'
import { useObjectList } from '@/hooks/useObjectList'
import { useDirectoryStore } from '@/stores/directoryStore'
import { useDeleteUser, useEnableUser, useDisableUser } from '@/hooks/useUserMutations'
import { useDeleteGroup } from '@/hooks/useGroupMutations'
import { useDeleteComputer } from '@/hooks/useComputerMutations'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import ObjectListToolbar from './ObjectListToolbar'
import UserPropertiesDialog from '@/components/users/UserPropertiesDialog'
import CreateUserDialog from '@/components/users/CreateUserDialog'
import PasswordResetDialog from '@/components/users/PasswordResetDialog'
import GroupPropertiesDialog from '@/components/groups/GroupPropertiesDialog'
import CreateGroupDialog from '@/components/groups/CreateGroupDialog'
import ComputerPropertiesDialog from '@/components/computers/ComputerPropertiesDialog'
import CreateComputerDialog from '@/components/computers/CreateComputerDialog'

function ObjectIcon({ type }: { type: ObjectSummary['type'] }) {
  const className = 'h-4 w-4 shrink-0'

  switch (type) {
    case 'user':
      return <User className={cn(className, 'text-blue-600')} />
    case 'group':
      return <Users className={cn(className, 'text-amber-600')} />
    case 'computer':
      return <Monitor className={cn(className, 'text-green-600')} />
    case 'contact':
      return <Mail className={cn(className, 'text-purple-600')} />
    default:
      return <HelpCircle className={cn(className, 'text-muted-foreground')} />
  }
}

function typeLabel(type: ObjectSummary['type']): string {
  switch (type) {
    case 'user':
      return 'User'
    case 'group':
      return 'Group'
    case 'computer':
      return 'Computer'
    case 'contact':
      return 'Contact'
    default:
      return 'Unknown'
  }
}

export default function ObjectList() {
  const selectedNode = useDirectoryStore((s) => s.selectedNode)
  const { data, isLoading, error } = useObjectList(selectedNode)

  const [selectedDn, setSelectedDn] = useState<string | null>(null)

  // User dialogs
  const [userPropertiesDn, setUserPropertiesDn] = useState<string | null>(null)
  const [userPropertiesOpen, setUserPropertiesOpen] = useState(false)
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [passwordResetOpen, setPasswordResetOpen] = useState(false)

  // Group dialogs
  const [groupPropertiesDn, setGroupPropertiesDn] = useState<string | null>(null)
  const [groupPropertiesOpen, setGroupPropertiesOpen] = useState(false)
  const [createGroupOpen, setCreateGroupOpen] = useState(false)

  // Computer dialogs
  const [computerPropertiesDn, setComputerPropertiesDn] = useState<string | null>(null)
  const [computerPropertiesOpen, setComputerPropertiesOpen] = useState(false)
  const [createComputerOpen, setCreateComputerOpen] = useState(false)

  const deleteUserMutation = useDeleteUser()
  const enableMutation = useEnableUser()
  const disableMutation = useDisableUser()
  const deleteGroupMutation = useDeleteGroup()
  const deleteComputerMutation = useDeleteComputer()

  const selectedObj = data?.data.find((o) => o.dn === selectedDn) ?? null

  function handleDoubleClick(obj: ObjectSummary) {
    switch (obj.type) {
      case 'user':
        setUserPropertiesDn(obj.dn)
        setUserPropertiesOpen(true)
        break
      case 'group':
        setGroupPropertiesDn(obj.dn)
        setGroupPropertiesOpen(true)
        break
      case 'computer':
        setComputerPropertiesDn(obj.dn)
        setComputerPropertiesOpen(true)
        break
    }
  }

  function handleDelete() {
    if (!selectedDn || !selectedObj) return
    if (!window.confirm(`Delete ${selectedObj.name}?`)) return

    switch (selectedObj.type) {
      case 'user':
        deleteUserMutation.mutate(selectedDn)
        break
      case 'group':
        deleteGroupMutation.mutate(selectedDn)
        break
      case 'computer':
        deleteComputerMutation.mutate(selectedDn)
        break
    }
    setSelectedDn(null)
  }

  function handleEnable() {
    if (!selectedDn) return
    enableMutation.mutate(selectedDn)
  }

  function handleDisable() {
    if (!selectedDn) return
    disableMutation.mutate(selectedDn)
  }

  function handleResetPassword() {
    if (!selectedDn || !selectedObj) return
    setPasswordResetOpen(true)
  }

  if (!selectedNode) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a container in the tree to view its objects.
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <ObjectListToolbar
        selectedType={selectedObj?.type ?? null}
        selectedEnabled={selectedObj?.type === 'user' ? (selectedObj.enabled ?? null) : null}
        onNewUser={() => setCreateUserOpen(true)}
        onNewGroup={() => setCreateGroupOpen(true)}
        onNewComputer={() => setCreateComputerOpen(true)}
        onDelete={handleDelete}
        onEnable={handleEnable}
        onDisable={handleDisable}
        onResetPassword={handleResetPassword}
      />

      {isLoading && (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading objects...
        </div>
      )}

      {error && (
        <div className="flex flex-1 items-center justify-center text-sm text-destructive">
          Failed to load objects.
        </div>
      )}

      {!isLoading && !error && data && data.data.length === 0 && (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          No objects in this container.
        </div>
      )}

      {!isLoading && !error && data && data.data.length > 0 && (
        <div className="flex-1 overflow-auto p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">Name</TableHead>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((obj) => (
                <TableRow
                  key={obj.dn}
                  className={cn(
                    'cursor-pointer',
                    selectedDn === obj.dn && 'bg-accent',
                  )}
                  onClick={() => setSelectedDn(obj.dn)}
                  onDoubleClick={() => handleDoubleClick(obj)}
                >
                  <TableCell>
                    <div
                      className={cn(
                        'flex items-center gap-2',
                        obj.type === 'user' && obj.enabled === false && 'text-muted-foreground',
                      )}
                    >
                      <ObjectIcon type={obj.type} />
                      <span className="truncate">{obj.name}</span>
                      {obj.type === 'user' && obj.enabled === false && (
                        <span className="ml-1 text-xs text-muted-foreground">(disabled)</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {typeLabel(obj.type)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {obj.description ?? ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.totalPages > 1 && (
            <div className="mt-2 text-xs text-muted-foreground">
              Page {data.page} of {data.totalPages} ({data.total} objects)
            </div>
          )}
        </div>
      )}

      {/* User dialogs */}
      <UserPropertiesDialog
        dn={userPropertiesDn}
        open={userPropertiesOpen}
        onOpenChange={setUserPropertiesOpen}
      />

      <CreateUserDialog open={createUserOpen} onOpenChange={setCreateUserOpen} />

      <PasswordResetDialog
        dn={selectedDn}
        userName={selectedObj?.name ?? ''}
        open={passwordResetOpen}
        onOpenChange={setPasswordResetOpen}
      />

      {/* Group dialogs */}
      <GroupPropertiesDialog
        dn={groupPropertiesDn}
        open={groupPropertiesOpen}
        onOpenChange={setGroupPropertiesOpen}
      />

      <CreateGroupDialog open={createGroupOpen} onOpenChange={setCreateGroupOpen} />

      {/* Computer dialogs */}
      <ComputerPropertiesDialog
        dn={computerPropertiesDn}
        open={computerPropertiesOpen}
        onOpenChange={setComputerPropertiesOpen}
      />

      <CreateComputerDialog open={createComputerOpen} onOpenChange={setCreateComputerOpen} />
    </div>
  )
}
