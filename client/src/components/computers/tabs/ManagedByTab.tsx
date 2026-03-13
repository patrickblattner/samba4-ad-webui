import type { UpdateComputerRequest } from '@samba-ad/shared'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface ManagedByTabProps {
  managedBy: string | undefined
  draft: UpdateComputerRequest
  onChange: (patch: Partial<UpdateComputerRequest>) => void
}

/** Extract the CN from a DN string */
function cnFromDn(dn: string): string {
  const match = dn.match(/^CN=([^,]+)/i)
  return match ? match[1] : dn
}

export default function ManagedByTab({ managedBy, draft, onChange }: ManagedByTabProps) {
  const currentValue = draft.managedBy !== undefined ? draft.managedBy : managedBy
  const displayValue = currentValue ? cnFromDn(currentValue) : ''

  return (
    <div className="grid gap-4 py-2">
      <Label>Managed by</Label>

      <div className="flex items-center gap-2">
        <Input
          value={displayValue}
          disabled
          className="flex-1"
          placeholder="No manager set"
        />
        {currentValue && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => onChange({ managedBy: null })}
            title="Clear managed by"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {currentValue && (
        <p className="text-xs text-muted-foreground" title={currentValue}>
          DN: {currentValue}
        </p>
      )}
    </div>
  )
}
