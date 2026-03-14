import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface OuGeneralTabProps {
  ouName: string
  draft: { description?: string }
  onChange: (patch: { description?: string }) => void
}

export default function OuGeneralTab({ ouName, draft, onChange }: OuGeneralTabProps) {
  return (
    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-[140px_1fr] items-center gap-x-4 gap-y-3">
        <Label>Name</Label>
        <span className="text-sm">{ouName}</span>

        <Label htmlFor="ou-description">Description</Label>
        <Input
          id="ou-description"
          value={draft.description ?? ''}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>
    </div>
  )
}
