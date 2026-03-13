import type { AdUser, UpdateUserRequest } from '@samba-ad/shared'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface TelephonesTabProps {
  user: AdUser
  draft: UpdateUserRequest
  onChange: (patch: Partial<UpdateUserRequest>) => void
}

export default function TelephonesTab({ user, draft, onChange }: TelephonesTabProps) {
  return (
    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-[140px_1fr] items-center gap-x-4 gap-y-3">
        <Label htmlFor="homePhone">Home</Label>
        <Input
          id="homePhone"
          value={draft.homePhone ?? user.homePhone ?? ''}
          onChange={(e) => onChange({ homePhone: e.target.value || null })}
        />

        <Label htmlFor="pager">Pager</Label>
        <Input
          id="pager"
          value={draft.pager ?? user.pager ?? ''}
          onChange={(e) => onChange({ pager: e.target.value || null })}
        />

        <Label htmlFor="mobile">Mobile</Label>
        <Input
          id="mobile"
          value={draft.mobile ?? user.mobile ?? ''}
          onChange={(e) => onChange({ mobile: e.target.value || null })}
        />

        <Label htmlFor="fax">Fax</Label>
        <Input
          id="fax"
          value={draft.facsimileTelephoneNumber ?? user.facsimileTelephoneNumber ?? ''}
          onChange={(e) => onChange({ facsimileTelephoneNumber: e.target.value || null })}
        />

        <Label htmlFor="ipPhone">IP phone</Label>
        <Input
          id="ipPhone"
          value={draft.ipPhone ?? user.ipPhone ?? ''}
          onChange={(e) => onChange({ ipPhone: e.target.value || null })}
        />
      </div>

      <div className="mt-2">
        <Label htmlFor="info">Notes</Label>
        <Textarea
          id="info"
          rows={4}
          className="mt-1"
          value={draft.info ?? user.info ?? ''}
          onChange={(e) => onChange({ info: e.target.value || null })}
        />
      </div>
    </div>
  )
}
