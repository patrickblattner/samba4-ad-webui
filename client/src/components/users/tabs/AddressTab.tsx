import type { AdUser, UpdateUserRequest } from '@samba-ad/shared'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { COUNTRIES } from '@/data/countries'

interface AddressTabProps {
  user: AdUser
  draft: UpdateUserRequest
  onChange: (patch: Partial<UpdateUserRequest>) => void
}

export default function AddressTab({ user, draft, onChange }: AddressTabProps) {
  const currentCountry = draft.c ?? user.c ?? ''

  function handleCountryChange(code: string) {
    if (code === '__none__') {
      onChange({ c: null, co: null, countryCode: null })
      return
    }
    const entry = COUNTRIES.find((c) => c.code === code)
    if (entry) {
      onChange({ c: entry.code, co: entry.name, countryCode: entry.numericCode })
    }
  }

  return (
    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-[140px_1fr] items-start gap-x-4 gap-y-3">
        <Label htmlFor="streetAddress">Street</Label>
        <Textarea
          id="streetAddress"
          rows={3}
          value={draft.streetAddress ?? user.streetAddress ?? ''}
          onChange={(e) => onChange({ streetAddress: e.target.value || null })}
        />

        <Label htmlFor="postOfficeBox">P.O. Box</Label>
        <Input
          id="postOfficeBox"
          value={draft.postOfficeBox ?? user.postOfficeBox ?? ''}
          onChange={(e) => onChange({ postOfficeBox: e.target.value || null })}
        />

        <Label htmlFor="l">City</Label>
        <Input
          id="l"
          value={draft.l ?? user.l ?? ''}
          onChange={(e) => onChange({ l: e.target.value || null })}
        />

        <Label htmlFor="st">State/Province</Label>
        <Input
          id="st"
          value={draft.st ?? user.st ?? ''}
          onChange={(e) => onChange({ st: e.target.value || null })}
        />

        <Label htmlFor="postalCode">Zip/Postal code</Label>
        <Input
          id="postalCode"
          value={draft.postalCode ?? user.postalCode ?? ''}
          onChange={(e) => onChange({ postalCode: e.target.value || null })}
        />

        <Label>Country/Region</Label>
        <Select value={currentCountry || '__none__'} onValueChange={handleCountryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">(none)</SelectItem>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
