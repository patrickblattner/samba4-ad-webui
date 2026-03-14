import { useState, useEffect, useCallback } from 'react'
import { User, Users, Monitor, HelpCircle, Mail, Loader2 } from 'lucide-react'
import type { ObjectSummary } from '@samba-ad/shared'
import { useQueryClient } from '@tanstack/react-query'
import { useObjectList } from '@/hooks/useObjectList'
import { useDirectoryStore } from '@/stores/directoryStore'
import { useDialogStore } from '@/stores/dialogStore'
import { useDeleteUser, useEnableUser, useDisableUser, useMoveUser } from '@/hooks/useUserMutations'
import { useDeleteGroup, useMoveGroup } from '@/hooks/useGroupMutations'
import { useDeleteComputer, useMoveComputer } from '@/hooks/useComputerMutations'
import { useMoveOu } from '@/hooks/useOuMutations'
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
import CreateOuDialog from '@/components/ous/CreateOuDialog'
import DeleteOuDialog from '@/components/ous/DeleteOuDialog'
import RenameOuDialog from '@/components/ous/RenameOuDialog'
import OuPropertiesDialog from '@/components/ous/OuPropertiesDialog'
import ObjectContextMenu from '@/components/context-menus/ObjectContextMenu'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import MoveObjectDialog from '@/components/shared/MoveObjectDialog'

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

/** Extract a display name from a DN for the OU delete dialog */
function extractNameFromDn(dn: string): string {
  const match = dn.match(/^(?:OU|CN)=([^,]+)/i)
  return match ? match[1] : dn
}

export default function ObjectList() {
  const selectedNode = useDirectoryStore((s) => s.selectedNode)
  const { activeDialog, targetDn, targetName, closeDialog } = useDialogStore()
  const { data, isLoading, error } = useObjectList(selectedNode)
  const queryClient = useQueryClient()

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

  // OU dialogs
  const [createOuOpen, setCreateOuOpen] = useState(false)
  const [deleteOuOpen, setDeleteOuOpen] = useState(false)
  const [renameOuOpen, setRenameOuOpen] = useState(false)
  const [moveOuOpen, setMoveOuOpen] = useState(false)
  const [ouPropertiesOpen, setOuPropertiesOpen] = useState(false)
  const [ouDn, setOuDn] = useState<string | null>(null)
  const [ouName, setOuName] = useState<string>('')

  // React to dialog requests from tree context menu
  useEffect(() => {
    if (!activeDialog) return
    switch (activeDialog) {
      case 'createUser':
        setCreateUserOpen(true)
        break
      case 'createGroup':
        setCreateGroupOpen(true)
        break
      case 'createComputer':
        setCreateComputerOpen(true)
        break
      case 'createOu':
        setCreateOuOpen(true)
        break
      case 'deleteOu':
        setDeleteOuOpen(true)
        break
      case 'renameOu':
        setOuDn(targetDn)
        setOuName(targetName ?? '')
        setRenameOuOpen(true)
        break
      case 'moveOu':
        setOuDn(targetDn)
        setOuName(targetName ?? '')
        setMoveOuOpen(true)
        break
      case 'ouProperties':
        setOuDn(targetDn)
        setOuName(targetName ?? '')
        setOuPropertiesOpen(true)
        break
    }
    closeDialog()
  }, [activeDialog, targetDn, targetName, closeDialog])

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<ObjectSummary | null>(null)

  // Move dialog
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveTarget, setMoveTarget] = useState<ObjectSummary | null>(null)

  const deleteUserMutation = useDeleteUser()
  const enableMutation = useEnableUser()
  const disableMutation = useDisableUser()
  const deleteGroupMutation = useDeleteGroup()
  const deleteComputerMutation = useDeleteComputer()
  const moveUserMutation = useMoveUser()
  const moveGroupMutation = useMoveGroup()
  const moveComputerMutation = useMoveComputer()
  const moveOuMutation = useMoveOu()

  const selectedObj = data?.data.find((o) => o.dn === selectedDn) ?? null

  const openProperties = useCallback((obj: ObjectSummary) => {
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
  }, [])

  function handleDoubleClick(obj: ObjectSummary) {
    openProperties(obj)
  }

  function requestDelete(obj?: ObjectSummary | null) {
    const target = obj ?? selectedObj
    if (!target) return
    setConfirmTarget(target)
    setConfirmOpen(true)
  }

  function executeDelete() {
    if (!confirmTarget) return
    switch (confirmTarget.type) {
      case 'user':
        deleteUserMutation.mutate(confirmTarget.dn)
        break
      case 'group':
        deleteGroupMutation.mutate(confirmTarget.dn)
        break
      case 'computer':
        deleteComputerMutation.mutate(confirmTarget.dn)
        break
    }
    setSelectedDn(null)
    setConfirmTarget(null)
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

  function handleMove(obj?: ObjectSummary | null) {
    const target = obj ?? selectedObj
    if (!target) return
    setMoveTarget(target)
    setMoveOpen(true)
  }

  function executeMove(targetOu: string) {
    if (!moveTarget) return
    const dn = moveTarget.dn
    switch (moveTarget.type) {
      case 'user':
        moveUserMutation.mutate({ dn, targetOu }, { onSuccess: () => setMoveOpen(false) })
        break
      case 'group':
        moveGroupMutation.mutate({ dn, targetOu }, { onSuccess: () => setMoveOpen(false) })
        break
      case 'computer':
        moveComputerMutation.mutate({ dn, targetOu }, { onSuccess: () => setMoveOpen(false) })
        break
    }
  }

  function handleCopyDn(dn: string) {
    navigator.clipboard.writeText(dn).catch(() => {
      // Fallback: silently fail
    })
  }

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ['objects'] })
    queryClient.invalidateQueries({ queryKey: ['tree'] })
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Check if any dialog is open
      if (
        userPropertiesOpen || createUserOpen || passwordResetOpen ||
        groupPropertiesOpen || createGroupOpen ||
        computerPropertiesOpen || createComputerOpen ||
        createOuOpen || deleteOuOpen || renameOuOpen || moveOuOpen || ouPropertiesOpen ||
        confirmOpen || moveOpen
      ) {
        return
      }

      switch (e.key) {
        case 'F5':
          e.preventDefault()
          handleRefresh()
          break
        case 'Delete':
          if (selectedObj) {
            requestDelete(selectedObj)
          }
          break
        case 'Enter':
          if (selectedObj) {
            openProperties(selectedObj)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedObj, userPropertiesOpen, createUserOpen, passwordResetOpen,
      groupPropertiesOpen, createGroupOpen, computerPropertiesOpen,
      createComputerOpen, createOuOpen, deleteOuOpen, renameOuOpen, moveOuOpen,
      ouPropertiesOpen, confirmOpen, moveOpen])

  if (!selectedNode) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a container in the tree to view its objects.
      </div>
    )
  }

  const isMovePending = moveUserMutation.isPending || moveGroupMutation.isPending || moveComputerMutation.isPending || moveOuMutation.isPending

  return (
    <div className="flex h-full flex-col">
      <ObjectListToolbar
        selectedType={selectedObj?.type ?? null}
        selectedEnabled={selectedObj?.type === 'user' ? (selectedObj.enabled ?? null) : null}
        onNewUser={() => setCreateUserOpen(true)}
        onNewGroup={() => setCreateGroupOpen(true)}
        onNewComputer={() => setCreateComputerOpen(true)}
        onNewOu={() => setCreateOuOpen(true)}
        onDeleteOu={() => setDeleteOuOpen(true)}
        onDelete={() => requestDelete()}
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
                <ObjectContextMenu
                  key={obj.dn}
                  object={obj}
                  onProperties={() => openProperties(obj)}
                  onDelete={() => requestDelete(obj)}
                  onResetPassword={obj.type === 'user' ? () => {
                    setSelectedDn(obj.dn)
                    setPasswordResetOpen(true)
                  } : undefined}
                  onEnable={obj.type === 'user' && obj.enabled === false ? () => enableMutation.mutate(obj.dn) : undefined}
                  onDisable={obj.type === 'user' && obj.enabled !== false ? () => disableMutation.mutate(obj.dn) : undefined}
                  onMove={() => handleMove(obj)}
                  onCopyDn={() => handleCopyDn(obj.dn)}
                >
                  <TableRow
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
                </ObjectContextMenu>
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

      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Object"
        description={`Are you sure you want to delete "${confirmTarget?.name ?? ''}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={executeDelete}
      />

      {/* Move object dialog */}
      <MoveObjectDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        objectName={moveTarget?.name ?? ''}
        objectDn={moveTarget?.dn ?? ''}
        onMove={executeMove}
        isPending={isMovePending}
      />

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

      {/* OU dialogs */}
      <CreateOuDialog open={createOuOpen} onOpenChange={setCreateOuOpen} />

      <DeleteOuDialog
        dn={selectedNode}
        ouName={selectedNode ? extractNameFromDn(selectedNode) : ''}
        open={deleteOuOpen}
        onOpenChange={setDeleteOuOpen}
      />

      <RenameOuDialog
        dn={ouDn}
        currentName={ouName}
        open={renameOuOpen}
        onOpenChange={setRenameOuOpen}
      />

      <MoveObjectDialog
        open={moveOuOpen}
        onOpenChange={setMoveOuOpen}
        objectName={ouName}
        objectDn={ouDn ?? ''}
        onMove={(targetOu) => moveOuMutation.mutateAsync({ dn: ouDn!, targetOu }).then(() => setMoveOuOpen(false))}
        isPending={moveOuMutation.isPending}
      />

      <OuPropertiesDialog
        dn={ouDn}
        open={ouPropertiesOpen}
        onOpenChange={setOuPropertiesOpen}
      />
    </div>
  )
}
