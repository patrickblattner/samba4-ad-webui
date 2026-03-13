import { useState, useEffect } from 'react'
import { validateSamAccountName } from '@samba-ad/shared'
import { useCreateComputer } from '@/hooks/useComputerMutations'
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

interface CreateComputerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function CreateComputerDialog({ open, onOpenChange }: CreateComputerDialogProps) {
  const selectedNode = useDirectoryStore((s) => s.selectedNode)
  const createMutation = useCreateComputer()
  const [name, setName] = useState('')
  const [samName, setSamName] = useState('')
  const [autoSam, setAutoSam] = useState(true)
  const [description, setDescription] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName('')
      setSamName('')
      setAutoSam(true)
      setDescription('')
      setErrorMsg('')
    }
  }, [open])

  // Auto-generate sAMAccountName from name (uppercase with $ suffix is convention)
  useEffect(() => {
    if (autoSam) {
      setSamName(name.toUpperCase())
    }
  }, [name, autoSam])

  async function handleCreate() {
    setErrorMsg('')

    if (!name.trim()) {
      setErrorMsg('Computer name is required.')
      return
    }
    if (!samName.trim()) {
      setErrorMsg('Computer name (pre-Windows 2000) is required.')
      return
    }
    const samResult = validateSamAccountName(samName, 'computer')
    if (!samResult.valid) {
      setErrorMsg(samResult.error!)
      return
    }
    if (!selectedNode) {
      setErrorMsg('No container selected in the tree.')
      return
    }

    try {
      await createMutation.mutateAsync({
        parentDn: selectedNode,
        name: name.trim(),
        sAMAccountName: samName.trim(),
        description: description.trim() || undefined,
      })
      onOpenChange(false)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create computer.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[450px]">
        <DialogHeader>
          <DialogTitle>New Computer</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-[140px_1fr] items-center gap-x-4 gap-y-3">
            <Label htmlFor="create-computer-name">Computer name</Label>
            <Input
              id="create-computer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Label htmlFor="create-computer-sam">Pre-Windows 2000</Label>
            <Input
              id="create-computer-sam"
              value={samName}
              onChange={(e) => {
                setAutoSam(false)
                setSamName(e.target.value)
              }}
            />

            <Label htmlFor="create-computer-desc">Description</Label>
            <Input
              id="create-computer-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

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
