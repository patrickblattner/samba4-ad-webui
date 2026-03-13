import type { AdUser, UpdateUserRequest } from '@samba-ad/shared'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface GeneralTabProps {
  user: AdUser
  draft: UpdateUserRequest
  onChange: (patch: Partial<UpdateUserRequest>) => void
}

export default function GeneralTab({ user, draft, onChange }: GeneralTabProps) {
  return (
    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-[140px_1fr] items-center gap-x-4 gap-y-3">
        <Label htmlFor="givenName">First name</Label>
        <Input
          id="givenName"
          value={draft.givenName ?? user.givenName ?? ''}
          onChange={(e) => onChange({ givenName: e.target.value || null })}
        />

        <Label htmlFor="sn">Last name</Label>
        <Input
          id="sn"
          value={draft.sn ?? user.sn ?? ''}
          onChange={(e) => onChange({ sn: e.target.value || null })}
        />

        <Label htmlFor="initials">Initials</Label>
        <Input
          id="initials"
          value={draft.initials ?? user.initials ?? ''}
          onChange={(e) => onChange({ initials: e.target.value || null })}
          className="w-20"
        />

        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          value={draft.displayName ?? user.displayName ?? ''}
          onChange={(e) => onChange({ displayName: e.target.value || null })}
        />

        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={draft.description ?? user.description ?? ''}
          onChange={(e) => onChange({ description: e.target.value || null })}
        />

        <Label htmlFor="office">Office</Label>
        <Input
          id="office"
          value={draft.physicalDeliveryOfficeName ?? user.physicalDeliveryOfficeName ?? ''}
          onChange={(e) => onChange({ physicalDeliveryOfficeName: e.target.value || null })}
        />

        <Label htmlFor="telephoneNumber">Telephone number</Label>
        <Input
          id="telephoneNumber"
          value={draft.telephoneNumber ?? user.telephoneNumber ?? ''}
          onChange={(e) => onChange({ telephoneNumber: e.target.value || null })}
        />

        <Label htmlFor="mail">E-mail</Label>
        <Input
          id="mail"
          value={draft.mail ?? user.mail ?? ''}
          onChange={(e) => onChange({ mail: e.target.value || null })}
        />

        <Label htmlFor="wWWHomePage">Web page</Label>
        <Input
          id="wWWHomePage"
          value={draft.wWWHomePage ?? user.wWWHomePage ?? ''}
          onChange={(e) => onChange({ wWWHomePage: e.target.value || null })}
        />
      </div>
    </div>
  )
}
