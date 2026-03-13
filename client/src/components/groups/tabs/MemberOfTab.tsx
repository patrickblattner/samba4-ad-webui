import type { AdGroup } from '@samba-ad/shared'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

interface MemberOfTabProps {
  group: AdGroup
}

/** Extract the CN from a DN string */
function cnFromDn(dn: string): string {
  const match = dn.match(/^CN=([^,]+)/i)
  return match ? match[1] : dn
}

export default function MemberOfTab({ group }: MemberOfTabProps) {
  const groups = group.memberOf ?? []

  return (
    <div className="grid gap-4 py-2">
      <Label>Member of</Label>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          This group is not a member of any other groups.
        </p>
      ) : (
        <ScrollArea className="h-[300px] rounded-md border">
          <div className="p-2 space-y-1">
            {groups.map((dn) => (
              <div
                key={dn}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                title={dn}
              >
                <Badge variant="secondary" className="shrink-0">
                  Group
                </Badge>
                <span className="truncate">{cnFromDn(dn)}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
