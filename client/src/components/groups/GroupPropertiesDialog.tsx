import { useState, useCallback, useEffect } from 'react'
import type { UpdateGroupRequest, GroupScope, GroupCategory } from '@samba-ad/shared'
import { GROUP_TYPE, validateSamAccountName } from '@samba-ad/shared'
import { useGroup } from '@/hooks/useGroup'
import { useUpdateGroup, useAddGroupMembers, useRemoveGroupMembers } from '@/hooks/useGroupMutations'
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
import MembersTab from './tabs/MembersTab'
import MemberOfTab from './tabs/MemberOfTab'
import ManagedByTab from './tabs/ManagedByTab'
import ObjectTab from '@/components/objects/ObjectTab'
import SecurityTab from '@/components/security/SecurityTab'
import AttributeEditorTab from '@/components/attributes/AttributeEditorTab'

interface GroupPropertiesDialogProps {
  dn: string | null
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
    // GROUP_TYPE.SECURITY is 0x80000000 which is negative in 32-bit signed
    value = (value | GROUP_TYPE.SECURITY) >>> 0
    // Convert to signed 32-bit integer
    value = value | 0
  }
  return value
}

function getScope(groupType: number): GroupScope {
  if (groupType & GROUP_TYPE.UNIVERSAL) return 'universal'
  if (groupType & GROUP_TYPE.DOMAIN_LOCAL) return 'domainLocal'
  return 'global'
}

function getCategory(groupType: number): GroupCategory {
  if (groupType & GROUP_TYPE.SECURITY) return 'security'
  return 'distribution'
}

export default function GroupPropertiesDialog({
  dn,
  open,
  onOpenChange,
}: GroupPropertiesDialogProps) {
  const { data: group, isLoading, error } = useGroup(open ? dn : null)
  const updateMutation = useUpdateGroup()
  const addMembersMutation = useAddGroupMembers()
  const removeMembersMutation = useRemoveGroupMembers()
  const [draft, setDraft] = useState<UpdateGroupRequest>({})
  const [activeTab, setActiveTab] = useState('general')
  const [scopeOverride, setScopeOverride] = useState<GroupScope | null>(null)
  const [categoryOverride, setCategoryOverride] = useState<GroupCategory | null>(null)
  const [validationError, setValidationError] = useState('')

  // Reset draft when group data loads or dialog opens
  useEffect(() => {
    if (group) {
      setDraft({})
      setScopeOverride(null)
      setCategoryOverride(null)
      setValidationError('')
    }
  }, [group])

  // Reset tab when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab('general')
    }
  }, [open])

  const handleChange = useCallback((patch: Partial<UpdateGroupRequest>) => {
    setDraft((prev) => ({ ...prev, ...patch }))
  }, [])

  const hasGroupTypeChange = scopeOverride !== null || categoryOverride !== null
  const hasPendingChanges = Object.keys(draft).length > 0 || hasGroupTypeChange

  function validate(): boolean {
    setValidationError('')
    if (draft.sAMAccountName !== undefined) {
      const result = validateSamAccountName(draft.sAMAccountName, 'group')
      if (!result.valid) {
        setValidationError(result.error!)
        return false
      }
    }
    return true
  }

  async function handleApply() {
    if (!dn || !hasPendingChanges || !group) return
    if (!validate()) return

    if (Object.keys(draft).length > 0) {
      await updateMutation.mutateAsync({ dn, data: draft })
    }

    setDraft({})
    setScopeOverride(null)
    setCategoryOverride(null)
  }

  async function handleOk() {
    if (dn && hasPendingChanges && group) {
      if (!validate()) return
      if (Object.keys(draft).length > 0) {
        await updateMutation.mutateAsync({ dn, data: draft })
      }
    }
    setDraft({})
    setScopeOverride(null)
    setCategoryOverride(null)
    onOpenChange(false)
  }

  function handleCancel() {
    setDraft({})
    setScopeOverride(null)
    setCategoryOverride(null)
    setValidationError('')
    onOpenChange(false)
  }

  async function handleAddMember(memberDn: string) {
    if (!dn) return
    await addMembersMutation.mutateAsync({ dn, members: [memberDn] })
  }

  async function handleRemoveMember(memberDn: string) {
    if (!dn) return
    await removeMembersMutation.mutateAsync({ dn, members: [memberDn] })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[820px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {group
              ? `${group.sAMAccountName} Properties`
              : 'Group Properties'}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12 gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading group data...
          </div>
        )}

        {error && (
          <div className="py-12 text-center text-sm text-destructive">
            Failed to load group data.
          </div>
        )}

        {group && (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger value="memberOf">Member Of</TabsTrigger>
                <TabsTrigger value="managedBy">Managed By</TabsTrigger>
                <TabsTrigger value="object">Object</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="attributeEditor">Attribute Editor</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto px-1">
                <TabsContent value="general">
                  <GeneralTab
                    group={group}
                    draft={draft}
                    onChange={handleChange}
                    scopeOverride={scopeOverride}
                    categoryOverride={categoryOverride}
                    onScopeChange={setScopeOverride}
                    onCategoryChange={setCategoryOverride}
                  />
                </TabsContent>
                <TabsContent value="members">
                  <MembersTab
                    group={group}
                    onAddMember={handleAddMember}
                    onRemoveMember={handleRemoveMember}
                  />
                </TabsContent>
                <TabsContent value="memberOf">
                  <MemberOfTab group={group} />
                </TabsContent>
                <TabsContent value="managedBy">
                  <ManagedByTab
                    managedBy={group.managedBy}
                    draft={draft}
                    onChange={handleChange}
                  />
                </TabsContent>
                <TabsContent value="object">
                  <ObjectTab dn={dn!} />
                </TabsContent>
                <TabsContent value="security">
                  <SecurityTab dn={dn!} />
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
