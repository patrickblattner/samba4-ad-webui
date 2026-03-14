import { useState, useEffect } from 'react'
import { useRenameOu } from '@/hooks/useOuMutations'
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
import { Loader2 } from 'lucide-react'

interface RenameOuDialogProps {
  dn: string | null
  currentName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function RenameOuDialog({
  dn,
  currentName,
  open,
  onOpenChange,
}: RenameOuDialogProps) {
  const renameMutation = useRenameOu()
  const [name, setName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (open) {
      setName(currentName)
      setErrorMsg('')
    }
  }, [open, currentName])

  async function handleRename() {
    setErrorMsg('')

    if (!name.trim()) {
      setErrorMsg('Name is required.')
      return
    }

    if (!dn) {
      setErrorMsg('No OU selected.')
      return
    }

    if (name.trim() === currentName) {
      onOpenChange(false)
      return
    }

    try {
      await renameMutation.mutateAsync({ dn, newName: name.trim() })
      onOpenChange(false)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to rename OU.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Rename OU</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); handleRename() }}>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-[120px_1fr] items-center gap-x-4 gap-y-3">
              <Label htmlFor="rename-ou-name">New name</Label>
              <Input
                id="rename-ou-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
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
            <Button type="submit" disabled={renameMutation.isPending}>
              {renameMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
