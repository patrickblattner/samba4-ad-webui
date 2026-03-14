import { useState, useCallback, useEffect } from 'react'
import type { UpdateUserRequest } from '@samba-ad/shared'
import { validateSamAccountName } from '@samba-ad/shared'
import { useUser } from '@/hooks/useUser'
import { useUpdateUser } from '@/hooks/useUserMutations'
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
import AddressTab from './tabs/AddressTab'
import AccountTab from './tabs/AccountTab'
import ProfileTab from './tabs/ProfileTab'
import TelephonesTab from './tabs/TelephonesTab'
import OrganizationTab from './tabs/OrganizationTab'
import MemberOfTab from './tabs/MemberOfTab'
import ObjectTab from '@/components/objects/ObjectTab'
import SecurityTab from '@/components/security/SecurityTab'
import AttributeEditorTab from '@/components/attributes/AttributeEditorTab'

interface UserPropertiesDialogProps {
  dn: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function UserPropertiesDialog({
  dn,
  open,
  onOpenChange,
}: UserPropertiesDialogProps) {
  const { data: user, isLoading, error } = useUser(open ? dn : null)
  const updateMutation = useUpdateUser()
  const [draft, setDraft] = useState<UpdateUserRequest>({})
  const [activeTab, setActiveTab] = useState('general')
  const [validationError, setValidationError] = useState('')

  // Reset draft when user data loads or dialog opens
  useEffect(() => {
    if (user) {
      setDraft({})
      setValidationError('')
    }
  }, [user])

  // Reset tab when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab('general')
    }
  }, [open])

  const handleChange = useCallback((patch: Partial<UpdateUserRequest>) => {
    setDraft((prev) => ({ ...prev, ...patch }))
  }, [])

  const hasPendingChanges = Object.keys(draft).length > 0

  function validate(): boolean {
    setValidationError('')
    if (draft.sAMAccountName !== undefined) {
      const result = validateSamAccountName(draft.sAMAccountName, 'user')
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
            {user
              ? `${user.displayName || user.sAMAccountName} Properties`
              : 'User Properties'}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12 gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading user data...
          </div>
        )}

        {error && (
          <div className="py-12 text-center text-sm text-destructive">
            Failed to load user data.
          </div>
        )}

        {user && (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="address">Address</TabsTrigger>
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="telephones">Telephones</TabsTrigger>
                <TabsTrigger value="organization">Organization</TabsTrigger>
                <TabsTrigger value="memberOf">Member Of</TabsTrigger>
                <TabsTrigger value="object">Object</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="attributeEditor">Attribute Editor</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto px-1">
                <TabsContent value="general">
                  <GeneralTab user={user} draft={draft} onChange={handleChange} />
                </TabsContent>
                <TabsContent value="address">
                  <AddressTab user={user} draft={draft} onChange={handleChange} />
                </TabsContent>
                <TabsContent value="account">
                  <AccountTab user={user} draft={draft} onChange={handleChange} />
                </TabsContent>
                <TabsContent value="profile">
                  <ProfileTab user={user} draft={draft} onChange={handleChange} />
                </TabsContent>
                <TabsContent value="telephones">
                  <TelephonesTab user={user} draft={draft} onChange={handleChange} />
                </TabsContent>
                <TabsContent value="organization">
                  <OrganizationTab user={user} draft={draft} onChange={handleChange} />
                </TabsContent>
                <TabsContent value="memberOf">
                  <MemberOfTab user={user} />
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
