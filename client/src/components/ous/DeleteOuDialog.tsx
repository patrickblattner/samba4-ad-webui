import { useState, useEffect } from 'react'
import { useDeleteOu } from '@/hooks/useOuMutations'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface DeleteOuDialogProps {
  dn: string | null
  ouName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function DeleteOuDialog({
  dn,
  ouName,
  open,
  onOpenChange,
}: DeleteOuDialogProps) {
  const deleteMutation = useDeleteOu()
  const [recursive, setRecursive] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (open) {
      setRecursive(false)
      setErrorMsg('')
    }
  }, [open])

  async function handleDelete() {
    if (!dn) return
    setErrorMsg('')

    try {
      await deleteMutation.mutateAsync({ dn, recursive })
      onOpenChange(false)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete OU.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Delete Organizational Unit</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the organizational unit &quot;{ouName}&quot;?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            DN: {dn}
          </p>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="delete-recursive"
              checked={recursive}
              onCheckedChange={(checked) => setRecursive(checked === true)}
            />
            <Label htmlFor="delete-recursive" className="text-sm">
              Delete all child objects recursively
            </Label>
          </div>

          {recursive && (
            <p className="text-sm text-destructive font-medium">
              Warning: This will permanently delete all objects inside this OU, including
              users, groups, computers, and sub-OUs.
            </p>
          )}

          {errorMsg && (
            <p className="text-sm text-destructive">{errorMsg}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
