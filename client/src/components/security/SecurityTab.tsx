import { useState, useMemo } from 'react'
import type { AceEntry } from '@samba-ad/shared'
import { useObjectSecurity } from '@/hooks/useObjectInfo'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, Users, Shield } from 'lucide-react'
import AdvancedSecurityDialog from './AdvancedSecurityDialog'

interface SecurityTabProps {
  dn: string
}

interface PrincipalInfo {
  name: string
  sid: string
}

const STANDARD_PERMISSIONS = [
  { label: 'Full Control', mask: 0x10000000 },
  { label: 'Read', mask: 0x80000000 },
  { label: 'Write', mask: 0x40000000 },
  { label: 'Create All Child Objects', mask: 0x00000001 },
  { label: 'Delete All Child Objects', mask: 0x00000002 },
  { label: 'All Extended Rights', mask: 0x00000100 },
] as const

function extractUniquePrincipals(dacl: AceEntry[]): PrincipalInfo[] {
  const seen = new Set<string>()
  const principals: PrincipalInfo[] = []
  for (const ace of dacl) {
    if (!seen.has(ace.principalSid)) {
      seen.add(ace.principalSid)
      principals.push({ name: ace.principalName, sid: ace.principalSid })
    }
  }
  return principals
}

function extractObjectName(dn: string): string {
  const first = dn.split(',')[0]
  if (first) {
    const eqIndex = first.indexOf('=')
    if (eqIndex !== -1) {
      return first.substring(eqIndex + 1)
    }
  }
  return dn
}

export default function SecurityTab({ dn }: SecurityTabProps) {
  const { data, isLoading, error } = useObjectSecurity(dn)
  const [selectedSid, setSelectedSid] = useState<string | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const principals = useMemo(() => {
    if (!data) return []
    return extractUniquePrincipals(data.dacl)
  }, [data])

  // Auto-select first principal when data loads
  const effectiveSelectedSid = selectedSid ?? (principals.length > 0 ? principals[0].sid : null)
  const selectedPrincipal = principals.find((p) => p.sid === effectiveSelectedSid)

  const selectedAces = useMemo(() => {
    if (!data || !effectiveSelectedSid) return []
    return data.dacl.filter((ace) => ace.principalSid === effectiveSelectedSid)
  }, [data, effectiveSelectedSid])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading security information...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="py-12 text-center text-sm text-destructive">
        Failed to load security information.
      </div>
    )
  }

  const objectName = extractObjectName(dn)

  function computePermissionState(mask: number): { allow: boolean; deny: boolean } {
    let allow = false
    let deny = false
    for (const ace of selectedAces) {
      if ((ace.accessMask & mask) !== 0) {
        if (ace.type === 'allow') allow = true
        if (ace.type === 'deny') deny = true
      }
    }
    return { allow, deny }
  }

  return (
    <div className="grid gap-4 py-2">
      <div>
        <Label className="text-sm font-medium">Group or user names:</Label>
        <ScrollArea className="h-[140px] border rounded-md mt-1">
          <div className="p-1">
            {principals.map((principal) => (
              <button
                key={principal.sid}
                type="button"
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm text-left ${
                  principal.sid === effectiveSelectedSid
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-muted'
                }`}
                onClick={() => setSelectedSid(principal.sid)}
              >
                {principal.name.includes('\\') ? (
                  <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Shield className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{principal.name}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <Separator />

      <div>
        <Label className="text-sm font-medium">
          Permissions for {selectedPrincipal?.name ?? ''}:
        </Label>
        <div className="border rounded-md mt-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Permission</TableHead>
                <TableHead className="w-[70px] text-center">Allow</TableHead>
                <TableHead className="w-[70px] text-center">Deny</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {STANDARD_PERMISSIONS.map((perm) => {
                const state = computePermissionState(perm.mask)
                return (
                  <TableRow key={perm.label}>
                    <TableCell className="text-sm">{perm.label}</TableCell>
                    <TableCell className="text-center">
                      <Checkbox checked={state.allow} disabled />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox checked={state.deny} disabled />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => setAdvancedOpen(true)}>
          Advanced
        </Button>
      </div>

      {advancedOpen && (
        <AdvancedSecurityDialog
          open={advancedOpen}
          onOpenChange={setAdvancedOpen}
          data={data}
          objectName={objectName}
        />
      )}
    </div>
  )
}
