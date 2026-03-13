import { useState, useEffect } from 'react'
import type { GroupScope, GroupCategory } from '@samba-ad/shared'
import { GROUP_TYPE, validateSamAccountName } from '@samba-ad/shared'
import { useCreateGroup } from '@/hooks/useGroupMutations'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2 } from 'lucide-react'

interface CreateGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function buildGroupType(scope: GroupScope, category: GroupCategory): number {
  let value = 0
  switch (scope) {
    case 'global': value = GROUP_TYPE.GLOBAL; break
    case 'domainLocal': value = GROUP_TYPE.DOMAIN_LOCAL; break
    case 'universal': value = GROUP_TYPE.UNIVERSAL; break
  }
  if (category === 'security') {
    value = (value | GROUP_TYPE.SECURITY) >>> 0
    value = value | 0
  }
  return value
}

export default function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
  const selectedNode = useDirectoryStore((s) => s.selectedNode)
  const createMutation = useCreateGroup()
  const [name, setName] = useState('')
  const [samName, setSamName] = useState('')
  const [autoSam, setAutoSam] = useState(true)
  const [scope, setScope] = useState<GroupScope>('global')
  const [category, setCategory] = useState<GroupCategory>('security')
  const [errorMsg, setErrorMsg] = useState('')

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName('')
      setSamName('')
      setAutoSam(true)
      setScope('global')
      setCategory('security')
      setErrorMsg('')
    }
  }, [open])

  // Auto-generate sAMAccountName from name
  useEffect(() => {
    if (autoSam) {
      setSamName(name)
    }
  }, [name, autoSam])

  async function handleCreate() {
    setErrorMsg('')

    if (!name.trim()) {
      setErrorMsg('Group name is required.')
      return
    }
    if (!samName.trim()) {
      setErrorMsg('Group name (pre-Windows 2000) is required.')
      return
    }
    const samResult = validateSamAccountName(samName, 'group')
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
        groupType: buildGroupType(scope, category),
      })
      onOpenChange(false)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create group.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[450px]">
        <DialogHeader>
          <DialogTitle>New Group</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); handleCreate() }}>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-[140px_1fr] items-center gap-x-4 gap-y-3">
              <Label htmlFor="create-group-name">Group name</Label>
              <Input
                id="create-group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <Label htmlFor="create-group-sam">Pre-Windows 2000</Label>
              <Input
                id="create-group-sam"
                value={samName}
                onChange={(e) => {
                  setAutoSam(false)
                  setSamName(e.target.value)
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-6 mt-2">
              <div>
                <Label className="mb-2 block">Group scope</Label>
                <RadioGroup value={scope} onValueChange={(v) => setScope(v as GroupScope)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="domainLocal" id="create-scope-domainLocal" />
                    <Label htmlFor="create-scope-domainLocal" className="font-normal">Domain local</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="global" id="create-scope-global" />
                    <Label htmlFor="create-scope-global" className="font-normal">Global</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="universal" id="create-scope-universal" />
                    <Label htmlFor="create-scope-universal" className="font-normal">Universal</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="mb-2 block">Group type</Label>
                <RadioGroup value={category} onValueChange={(v) => setCategory(v as GroupCategory)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="security" id="create-type-security" />
                    <Label htmlFor="create-type-security" className="font-normal">Security</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="distribution" id="create-type-distribution" />
                    <Label htmlFor="create-type-distribution" className="font-normal">Distribution</Label>
                  </div>
                </RadioGroup>
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
  )
}
