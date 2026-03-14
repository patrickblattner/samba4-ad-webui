import { useState, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAttributes } from '@/api/attributes'
import { useUpdateOu } from '@/hooks/useOuMutations'
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
import OuGeneralTab from './tabs/OuGeneralTab'
import AttributeEditorTab from '@/components/attributes/AttributeEditorTab'

interface OuPropertiesDialogProps {
  dn: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function OuPropertiesDialog({
  dn,
  open,
  onOpenChange,
}: OuPropertiesDialogProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['attributes', dn],
    queryFn: () => getAttributes(dn!),
    enabled: open && !!dn,
  })

  const updateMutation = useUpdateOu()
  const [draft, setDraft] = useState<{ description?: string }>({})
  const [activeTab, setActiveTab] = useState('general')

  const attributes = data?.attributes ?? []
  const ouName = attributes.find((a) => a.name === 'ou')?.values[0] ?? ''
  const description = attributes.find((a) => a.name === 'description')?.values[0] ?? ''

  // Reset draft when data loads or dialog opens
  useEffect(() => {
    if (data) {
      const desc = data.attributes.find((a) => a.name === 'description')?.values[0] ?? ''
      setDraft({ description: desc })
    }
  }, [data])

  // Reset tab when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab('general')
    }
  }, [open])

  const handleChange = useCallback((patch: { description?: string }) => {
    setDraft((prev) => ({ ...prev, ...patch }))
  }, [])

  const hasPendingChanges = draft.description !== description

  async function handleApply() {
    if (!dn || !hasPendingChanges) return
    await updateMutation.mutateAsync({
      dn,
      data: { description: draft.description || undefined },
    })
  }

  async function handleOk() {
    if (dn && hasPendingChanges) {
      await updateMutation.mutateAsync({
        dn,
        data: { description: draft.description || undefined },
      })
    }
    onOpenChange(false)
  }

  function handleCancel() {
    setDraft({ description })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[820px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {ouName ? `${ouName} Properties` : 'OU Properties'}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12 gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading OU data...
          </div>
        )}

        {error && (
          <div className="py-12 text-center text-sm text-destructive">
            Failed to load OU data.
          </div>
        )}

        {data && (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="attributeEditor">Attribute Editor</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto px-1">
                <TabsContent value="general">
                  <OuGeneralTab
                    ouName={ouName}
                    draft={draft}
                    onChange={handleChange}
                  />
                </TabsContent>
                <TabsContent value="attributeEditor">
                  <AttributeEditorTab dn={dn!} />
                </TabsContent>
              </div>
            </Tabs>

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
