import type { AdComputer, UpdateComputerRequest } from '@samba-ad/shared'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface GeneralTabProps {
  computer: AdComputer
  draft: UpdateComputerRequest
  onChange: (patch: Partial<UpdateComputerRequest>) => void
}

export default function GeneralTab({ computer, draft, onChange }: GeneralTabProps) {
  return (
    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-[140px_1fr] items-center gap-x-4 gap-y-3">
        <Label htmlFor="computer-name">Computer name (pre-Windows 2000)</Label>
        <Input
          id="computer-name"
          value={draft.sAMAccountName ?? computer.sAMAccountName}
          onChange={(e) => onChange({ sAMAccountName: e.target.value })}
        />

        <Label htmlFor="computer-dns">DNS name</Label>
        <Input
          id="computer-dns"
          value={computer.dNSHostName ?? ''}
          disabled
        />

        <Label htmlFor="computer-description">Description</Label>
        <Input
          id="computer-description"
          value={draft.description ?? computer.description ?? ''}
          onChange={(e) => onChange({ description: e.target.value || null })}
        />
      </div>
    </div>
  )
}
