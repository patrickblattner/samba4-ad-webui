import type { AdUser, UpdateUserRequest } from '@samba-ad/shared'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface OrganizationTabProps {
  user: AdUser
  draft: UpdateUserRequest
  onChange: (patch: Partial<UpdateUserRequest>) => void
}

/** Extract the CN from a DN string */
function cnFromDn(dn: string): string {
  const match = dn.match(/^CN=([^,]+)/i)
  return match ? match[1] : dn
}

export default function OrganizationTab({ user, draft, onChange }: OrganizationTabProps) {
  const managerValue = draft.manager !== undefined ? draft.manager : user.manager

  return (
    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-[140px_1fr] items-center gap-x-4 gap-y-3">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={draft.title ?? user.title ?? ''}
          onChange={(e) => onChange({ title: e.target.value || null })}
        />

        <Label htmlFor="department">Department</Label>
        <Input
          id="department"
          value={draft.department ?? user.department ?? ''}
          onChange={(e) => onChange({ department: e.target.value || null })}
        />

        <Label htmlFor="company">Company</Label>
        <Input
          id="company"
          value={draft.company ?? user.company ?? ''}
          onChange={(e) => onChange({ company: e.target.value || null })}
        />

        <Label>Manager</Label>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            className="bg-muted flex-1"
            value={managerValue ? cnFromDn(managerValue) : ''}
            title={managerValue ?? ''}
          />
          {managerValue && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onChange({ manager: null })}
              title="Clear manager"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {user.directReports && user.directReports.length > 0 && (
        <div className="mt-2 space-y-2">
          <Label>Direct reports</Label>
          <div className="rounded-md border bg-muted/50 p-2">
            <ul className="space-y-1 text-sm">
              {user.directReports.map((dn) => (
                <li key={dn} className="truncate" title={dn}>
                  {cnFromDn(dn)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
