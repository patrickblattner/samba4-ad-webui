import type { AdComputer } from '@samba-ad/shared'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

interface MemberOfTabProps {
  computer: AdComputer
}

/** Extract the CN from a DN string */
function cnFromDn(dn: string): string {
  const match = dn.match(/^CN=([^,]+)/i)
  return match ? match[1] : dn
}

export default function MemberOfTab({ computer }: MemberOfTabProps) {
  const groups = computer.memberOf ?? []

  return (
    <div className="grid gap-4 py-2">
      <div className="flex items-center gap-2">
        <Label>Primary group:</Label>
        <span className="text-sm text-muted-foreground">
          {computer.primaryGroupID === 515
            ? 'Domain Computers'
            : computer.primaryGroupID === 516
              ? 'Domain Controllers'
              : `Group ID ${computer.primaryGroupID ?? 'N/A'}`}
        </span>
      </div>

      <div>
        <Label>Member of</Label>
        {groups.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            This computer is not a member of any additional groups.
          </p>
        ) : (
          <ScrollArea className="mt-2 h-[280px] rounded-md border">
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
    </div>
  )
}
