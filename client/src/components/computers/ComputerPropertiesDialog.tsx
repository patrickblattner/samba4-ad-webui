import { useState, useCallback, useEffect } from 'react'
import type { UpdateComputerRequest } from '@samba-ad/shared'
import { validateSamAccountName } from '@samba-ad/shared'
import { useComputer } from '@/hooks/useComputer'
import { useUpdateComputer } from '@/hooks/useComputerMutations'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import GeneralTab from './tabs/GeneralTab'
import OperatingSystemTab from './tabs/OperatingSystemTab'
import LocationTab from './tabs/LocationTab'
import MemberOfTab from './tabs/MemberOfTab'
import ManagedByTab from './tabs/ManagedByTab'
import ObjectTab from '@/components/objects/ObjectTab'
import AttributeEditorTab from '@/components/attributes/AttributeEditorTab'

interface ComputerPropertiesDialogProps {
  dn: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ComputerPropertiesDialog({
  dn,
  open,
  onOpenChange,
}: ComputerPropertiesDialogProps) {
  const { data: computer, isLoading, error } = useComputer(open ? dn : null)
  const updateMutation = useUpdateComputer()
  const [draft, setDraft] = useState<UpdateComputerRequest>({})
  const [activeTab, setActiveTab] = useState('general')
  const [validationError, setValidationError] = useState('')

  // Reset draft when computer data loads or dialog opens
  useEffect(() => {
    if (computer) {
      setDraft({})
      setValidationError('')
    }
  }, [computer])

  // Reset tab when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab('general')
    }
  }, [open])

  const handleChange = useCallback((patch: Partial<UpdateComputerRequest>) => {
    setDraft((prev) => ({ ...prev, ...patch }))
  }, [])

  const hasPendingChanges = Object.keys(draft).length > 0

  function validate(): boolean {
    setValidationError('')
    if (draft.sAMAccountName !== undefined) {
      const result = validateSamAccountName(draft.sAMAccountName, 'computer')
      if (!result.valid) {
        setValidationError(result.error!)
        return false
      }
    }
    return true
  }

  async function handleApply() {
    if (!dn || !hasPendingChanges) return
    if (!validate()) return
    await updateMutation.mutateAsync({ dn, data: draft })
    setDraft({})
  }

  async function handleOk() {
    if (dn && hasPendingChanges) {
      if (!validate()) return
      await updateMutation.mutateAsync({ dn, data: draft })
    }
    setDraft({})
    onOpenChange(false)
  }

  function handleCancel() {
    setDraft({})
    setValidationError('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[820px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {computer
              ? `${computer.sAMAccountName} Properties`
              : 'Computer Properties'}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12 gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading computer data...
          </div>
        )}

        {error && (
          <div className="py-12 text-center text-sm text-destructive">
            Failed to load computer data.
          </div>
        )}

        {computer && (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="operatingSystem">Operating System</TabsTrigger>
                <TabsTrigger value="location">Location</TabsTrigger>
                <TabsTrigger value="memberOf">Member Of</TabsTrigger>
                <TabsTrigger value="managedBy">Managed By</TabsTrigger>
                <TabsTrigger value="object">Object</TabsTrigger>
                <TabsTrigger value="attributeEditor">Attribute Editor</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto px-1">
                <TabsContent value="general">
                  <GeneralTab computer={computer} draft={draft} onChange={handleChange} />
                </TabsContent>
                <TabsContent value="operatingSystem">
                  <OperatingSystemTab computer={computer} />
                </TabsContent>
                <TabsContent value="location">
                  <LocationTab computer={computer} draft={draft} onChange={handleChange} />
                </TabsContent>
                <TabsContent value="memberOf">
                  <MemberOfTab computer={computer} />
                </TabsContent>
                <TabsContent value="managedBy">
                  <ManagedByTab
                    managedBy={computer.managedBy}
                    draft={draft}
                    onChange={handleChange}
                  />
                </TabsContent>
                <TabsContent value="object">
                  <ObjectTab dn={dn!} />
                </TabsContent>
                <TabsContent value="attributeEditor">
                  <AttributeEditorTab dn={dn!} />
                </TabsContent>
              </div>
            </Tabs>

            {validationError && (
              <p className="text-sm text-destructive px-1">{validationError}</p>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                variant="outline"
                disabled={!hasPendingChanges || updateMutation.isPending}
                onClick={handleApply}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Apply
              </Button>
              <Button
                disabled={updateMutation.isPending}
                onClick={handleOk}
              >
                OK
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
