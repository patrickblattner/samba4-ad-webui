import type { AdComputer, UpdateComputerRequest } from '@samba-ad/shared'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface LocationTabProps {
  computer: AdComputer
  draft: UpdateComputerRequest
  onChange: (patch: Partial<UpdateComputerRequest>) => void
}

export default function LocationTab({ computer, draft, onChange }: LocationTabProps) {
  return (
    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-[140px_1fr] items-center gap-x-4 gap-y-3">
        <Label htmlFor="computer-location">Location</Label>
        <Input
          id="computer-location"
          value={draft.location ?? computer.location ?? ''}
          onChange={(e) => onChange({ location: e.target.value || null })}
        />
      </div>
    </div>
  )
}
