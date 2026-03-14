import { useObjectInfo } from '@/hooks/useObjectInfo'
import { useSetObjectProtection } from '@/hooks/useObjectMutations'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'

interface ObjectTabProps {
  dn: string
}

function formatDateTime(iso: string): string {
  try {
    const date = new Date(iso)
    return date.toLocaleString()
  } catch {
    return iso
  }
}

export default function ObjectTab({ dn }: ObjectTabProps) {
  const { data: info, isLoading, error } = useObjectInfo(dn)
  const protectionMutation = useSetObjectProtection()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading object information...
      </div>
    )
  }

  if (error || !info) {
    return (
      <div className="py-12 text-center text-sm text-destructive">
        Failed to load object information.
      </div>
    )
  }

  function handleProtectionChange(checked: boolean | 'indeterminate') {
    if (typeof checked !== 'boolean') return
    protectionMutation.mutate({ dn, protect: checked })
  }

  return (
    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-[180px_1fr] items-center gap-x-4 gap-y-3">
        <Label htmlFor="canonicalName">Canonical name of object:</Label>
        <Input
          id="canonicalName"
          value={info.canonicalName}
          readOnly
          className="bg-muted"
        />

        <Label>Object class:</Label>
        <span className="text-sm">{info.objectClass}</span>

        <Label>Created:</Label>
        <span className="text-sm">{formatDateTime(info.whenCreated)}</span>

        <Label>Modified:</Label>
        <span className="text-sm">{formatDateTime(info.whenChanged)}</span>
      </div>

      <div className="mt-2">
        <Label className="text-sm font-medium">Update Sequence Numbers (USNs):</Label>
        <div className="grid grid-cols-[180px_1fr] items-center gap-x-4 gap-y-3 ml-4 mt-2">
          <Label>Current:</Label>
          <span className="text-sm">{info.uSNChanged}</span>

          <Label>Original:</Label>
          <span className="text-sm">{info.uSNCreated}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <Checkbox
          id="protectObject"
          checked={info.isProtected}
          onCheckedChange={handleProtectionChange}
          disabled={protectionMutation.isPending}
        />
        <Label htmlFor="protectObject" className="cursor-pointer">
          Protect object from accidental deletion
        </Label>
        {protectionMutation.isPending && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {protectionMutation.isError && (
        <p className="text-sm text-destructive">
          Failed to update protection: {protectionMutation.error?.message ?? 'Unknown error'}
        </p>
      )}
    </div>
  )
}
