import { useState, useEffect } from 'react'
import { useCreateOu } from '@/hooks/useOuMutations'
import { useDirectoryStore } from '@/stores/directoryStore'
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

interface CreateOuDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function CreateOuDialog({ open, onOpenChange }: CreateOuDialogProps) {
  const selectedNode = useDirectoryStore((s) => s.selectedNode)
  const createMutation = useCreateOu()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName('')
      setDescription('')
      setErrorMsg('')
    }
  }, [open])

  async function handleCreate() {
    setErrorMsg('')

    if (!name.trim()) {
      setErrorMsg('Name is required.')
      return
    }

    if (!selectedNode) {
      setErrorMsg('No container selected in the tree.')
      return
    }

    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        parentDn: selectedNode,
        description: description.trim() || undefined,
      })
      onOpenChange(false)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create OU.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle>New Organizational Unit</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-[120px_1fr] items-center gap-x-4 gap-y-3">
            <Label htmlFor="create-ou-name">Name</Label>
            <Input
              id="create-ou-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />

            <Label htmlFor="create-ou-desc">Description</Label>
            <Input
              id="create-ou-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Container: {selectedNode ?? '(none selected)'}
          </p>

          {errorMsg && (
            <p className="text-sm text-destructive">{errorMsg}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={createMutation.isPending}>
            {createMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
