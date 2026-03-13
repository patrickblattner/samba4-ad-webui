import type { AdUser, UpdateUserRequest } from '@samba-ad/shared'
import { UAC_FLAGS } from '@samba-ad/shared'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

interface AccountTabProps {
  user: AdUser
  draft: UpdateUserRequest
  onChange: (patch: Partial<UpdateUserRequest>) => void
}

/** AD "never expires" sentinel: 0 or 0x7FFFFFFFFFFFFFFF */
const NEVER_EXPIRES = '0'

export default function AccountTab({ user, draft, onChange }: AccountTabProps) {
  const uac = draft.userAccountControl ?? user.userAccountControl
  const accountExpires = draft.accountExpires !== undefined
    ? draft.accountExpires
    : user.accountExpires

  const neverExpires = !accountExpires || accountExpires === NEVER_EXPIRES || accountExpires === '9223372036854775807'

  function toggleFlag(flag: number, checked: boolean) {
    const current = draft.userAccountControl ?? user.userAccountControl
    const next = checked ? current | flag : current & ~flag
    onChange({ userAccountControl: next })
  }

  function hasFlag(flag: number): boolean {
    return (uac & flag) !== 0
  }

  function handleExpiresToggle(never: boolean) {
    if (never) {
      onChange({ accountExpires: NEVER_EXPIRES })
    } else {
      // default to tomorrow
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      onChange({ accountExpires: tomorrow.toISOString().split('T')[0] })
    }
  }

  function handleExpiresDate(dateStr: string) {
    onChange({ accountExpires: dateStr || null })
  }

  return (
    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-[140px_1fr] items-center gap-x-4 gap-y-3">
        <Label htmlFor="upn">User logon name</Label>
        <Input
          id="upn"
          value={draft.userPrincipalName ?? user.userPrincipalName ?? ''}
          onChange={(e) => onChange({ userPrincipalName: e.target.value })}
        />

        <Label htmlFor="sam">Pre-Windows 2000</Label>
        <Input
          id="sam"
          value={draft.sAMAccountName ?? user.sAMAccountName}
          onChange={(e) => onChange({ sAMAccountName: e.target.value })}
        />
      </div>

      <div className="mt-2 space-y-2">
        <h4 className="text-sm font-medium">Account options</h4>
        <div className="space-y-2 pl-1">
          <div className="flex items-center gap-2">
            <Checkbox
              id="uac-disabled"
              checked={hasFlag(UAC_FLAGS.ACCOUNTDISABLE)}
              onCheckedChange={(c) => toggleFlag(UAC_FLAGS.ACCOUNTDISABLE, !!c)}
            />
            <Label htmlFor="uac-disabled" className="font-normal">
              Account is disabled
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="uac-pwd-never-expires"
              checked={hasFlag(UAC_FLAGS.DONT_EXPIRE_PASSWORD)}
              onCheckedChange={(c) => toggleFlag(UAC_FLAGS.DONT_EXPIRE_PASSWORD, !!c)}
            />
            <Label htmlFor="uac-pwd-never-expires" className="font-normal">
              Password never expires
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="uac-must-change"
              checked={user.pwdLastSet === '0'}
              disabled
            />
            <Label htmlFor="uac-must-change" className="font-normal text-muted-foreground">
              User must change password at next logon
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="uac-cant-change"
              checked={hasFlag(UAC_FLAGS.PASSWD_CANT_CHANGE)}
              onCheckedChange={(c) => toggleFlag(UAC_FLAGS.PASSWD_CANT_CHANGE, !!c)}
            />
            <Label htmlFor="uac-cant-change" className="font-normal">
              User cannot change password
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="uac-smartcard"
              checked={hasFlag(UAC_FLAGS.SMARTCARD_REQUIRED)}
              onCheckedChange={(c) => toggleFlag(UAC_FLAGS.SMARTCARD_REQUIRED, !!c)}
            />
            <Label htmlFor="uac-smartcard" className="font-normal">
              Smart card is required for interactive logon
            </Label>
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-2">
        <h4 className="text-sm font-medium">Account expires</h4>
        <div className="flex items-center gap-4 pl-1">
          <div className="flex items-center gap-2">
            <input
              type="radio"
              id="never-expires"
              name="accountExpires"
              checked={neverExpires}
              onChange={() => handleExpiresToggle(true)}
              className="h-4 w-4"
            />
            <Label htmlFor="never-expires" className="font-normal">Never</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="radio"
              id="expires-on"
              name="accountExpires"
              checked={!neverExpires}
              onChange={() => handleExpiresToggle(false)}
              className="h-4 w-4"
            />
            <Label htmlFor="expires-on" className="font-normal">End of</Label>
            <Input
              type="date"
              disabled={neverExpires}
              value={neverExpires ? '' : (accountExpires ?? '')}
              onChange={(e) => handleExpiresDate(e.target.value)}
              className="w-44"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
