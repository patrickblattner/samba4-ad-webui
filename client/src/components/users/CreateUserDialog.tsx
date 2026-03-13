import { useState, useEffect } from 'react'
import { validateSamAccountName } from '@samba-ad/shared'
import { useCreateUser } from '@/hooks/useUserMutations'
import { useDirectoryStore } from '@/stores/directoryStore'
import { useConnectionSecurity } from '@/hooks/useConnectionSecurity'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, ShieldAlert } from 'lucide-react'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

interface CreateUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const selectedNode = useDirectoryStore((s) => s.selectedNode)
  const createMutation = useCreateUser()
  const { ldapsConfigured } = useConnectionSecurity()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [fullName, setFullName] = useState('')
  const [logonName, setLogonName] = useState('')
  const [samName, setSamName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [autoFullName, setAutoFullName] = useState(true)
  const [autoSam, setAutoSam] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [showInsecureWarning, setShowInsecureWarning] = useState(false)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFirstName('')
      setLastName('')
      setFullName('')
      setLogonName('')
      setSamName('')
      setPassword('')
      setConfirmPassword('')
      setAutoFullName(true)
      setAutoSam(true)
      setErrorMsg('')
    }
  }, [open])

  // Auto-generate full name and sAMAccountName
  useEffect(() => {
    if (autoFullName) {
      const name = [firstName, lastName].filter(Boolean).join(' ')
      setFullName(name)
    }
  }, [firstName, lastName, autoFullName])

  useEffect(() => {
    if (autoSam) {
      const sam = [firstName, lastName]
        .filter(Boolean)
        .join('.')
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '')
      setSamName(sam)
    }
  }, [firstName, lastName, autoSam])

  function validateForm(): boolean {
    setErrorMsg('')
    if (!samName.trim()) {
      setErrorMsg('User logon name is required.')
      return false
    }
    const samResult = validateSamAccountName(samName, 'user')
    if (!samResult.valid) {
      setErrorMsg(samResult.error!)
      return false
    }
    if (!logonName.trim()) {
      setErrorMsg('User logon name (UPN) is required.')
      return false
    }
    if (!password) {
      setErrorMsg('Password is required.')
      return false
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.')
      return false
    }
    if (!selectedNode) {
      setErrorMsg('No container selected in the tree.')
      return false
    }
    return true
  }

  function handleCreate() {
    if (!validateForm()) return
    if (!ldapsConfigured) {
      setShowInsecureWarning(true)
      return
    }
    doCreate()
  }

  async function doCreate() {
    if (!selectedNode) return
    try {
      await createMutation.mutateAsync({
        parentDn: selectedNode,
        sAMAccountName: samName.trim(),
        givenName: firstName.trim() || undefined,
        sn: lastName.trim() || undefined,
        displayName: fullName.trim() || undefined,
        userPrincipalName: logonName.trim(),
        password,
        enabled: true,
      })
      onOpenChange(false)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create user.')
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[450px]">
        <DialogHeader>
          <DialogTitle>New User</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); handleCreate() }}>
          <div className="grid gap-4 py-2">
            {!ldapsConfigured && (
              <div className="flex items-start gap-2 rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  LDAP connection is not encrypted (no LDAPS). The password will be transmitted in plain text.
                </span>
              </div>
            )}

            <div className="grid grid-cols-[140px_1fr] items-center gap-x-4 gap-y-3">
              <Label htmlFor="create-firstName">First name</Label>
              <Input
                id="create-firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />

              <Label htmlFor="create-lastName">Last name</Label>
              <Input
                id="create-lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />

              <Label htmlFor="create-fullName">Full name</Label>
              <Input
                id="create-fullName"
                value={fullName}
                onChange={(e) => {
                  setAutoFullName(false)
                  setFullName(e.target.value)
                }}
              />

              <Label htmlFor="create-upn">User logon name</Label>
              <Input
                id="create-upn"
                placeholder="user@domain"
                value={logonName}
                onChange={(e) => setLogonName(e.target.value)}
              />

              <Label htmlFor="create-sam">Pre-Windows 2000</Label>
              <Input
                id="create-sam"
                value={samName}
                onChange={(e) => {
                  setAutoSam(false)
                  setSamName(e.target.value)
                }}
              />
            </div>

            <div className="border-t pt-4 mt-2">
              <div className="grid grid-cols-[140px_1fr] items-center gap-x-4 gap-y-3">
                <Label htmlFor="create-password">Password</Label>
                <Input
                  id="create-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <Label htmlFor="create-confirm">Confirm password</Label>
                <Input
                  id="create-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-sm text-destructive">{errorMsg}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={showInsecureWarning}
      onOpenChange={setShowInsecureWarning}
      title="Insecure Connection"
      description="The LDAP connection is not encrypted (no LDAPS configured). The password will be transmitted in plain text over the network. Do you want to proceed anyway?"
      confirmLabel="Create Anyway"
      cancelLabel="Cancel"
      variant="destructive"
      onConfirm={doCreate}
    />
    </>
  )
}
