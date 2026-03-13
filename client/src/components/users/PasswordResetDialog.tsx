import { useState, useEffect } from 'react'
import { useResetPassword } from '@/hooks/useUserMutations'
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

interface PasswordResetDialogProps {
  dn: string | null
  userName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function PasswordResetDialog({
  dn,
  userName,
  open,
  onOpenChange,
}: PasswordResetDialogProps) {
  const resetMutation = useResetPassword()
  const { ldapsConfigured } = useConnectionSecurity()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [showInsecureWarning, setShowInsecureWarning] = useState(false)

  useEffect(() => {
    if (open) {
      setPassword('')
      setConfirmPassword('')
      setErrorMsg('')
    }
  }, [open])

  function validateForm(): boolean {
    setErrorMsg('')
    if (!password) {
      setErrorMsg('Password is required.')
      return false
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.')
      return false
    }
    if (!dn) return false
    return true
  }

  function handleReset() {
    if (!validateForm()) return
    if (!ldapsConfigured) {
      setShowInsecureWarning(true)
      return
    }
    doReset()
  }

  async function doReset() {
    if (!dn) return
    try {
      await resetMutation.mutateAsync({ dn, newPassword: password })
      onOpenChange(false)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to reset password.')
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Reset Password — {userName}</DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleReset() }}>
            <div className="grid gap-4 py-2">
              {!ldapsConfigured && (
                <div className="flex items-start gap-2 rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    LDAP connection is not encrypted (no LDAPS). Passwords will be transmitted in plain text.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-[140px_1fr] items-center gap-x-4 gap-y-3">
                <Label htmlFor="reset-password">New password</Label>
                <Input
                  id="reset-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <Label htmlFor="reset-confirm">Confirm password</Label>
                <Input
                  id="reset-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {errorMsg && (
                <p className="text-sm text-destructive">{errorMsg}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={resetMutation.isPending}>
                {resetMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Reset Password
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
        confirmLabel="Send Anyway"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={doReset}
      />
    </>
  )
}
