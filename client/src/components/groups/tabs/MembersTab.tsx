import { useState } from 'react'
import type { AdGroup } from '@samba-ad/shared'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, X } from 'lucide-react'

interface MembersTabProps {
  group: AdGroup
  onAddMember: (memberDn: string) => void
  onRemoveMember: (memberDn: string) => void
}

/** Extract the CN from a DN string */
function cnFromDn(dn: string): string {
  const match = dn.match(/^CN=([^,]+)/i)
  return match ? match[1] : dn
}

export default function MembersTab({ group, onAddMember, onRemoveMember }: MembersTabProps) {
  const members = group.member ?? []
  const [newMemberDn, setNewMemberDn] = useState('')

  function handleAdd() {
    const dn = newMemberDn.trim()
    if (!dn) return
    onAddMember(dn)
    setNewMemberDn('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="grid gap-4 py-2">
      <Label>Members</Label>

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          This group has no members.
        </p>
      ) : (
        <ScrollArea className="h-[240px] rounded-md border">
          <div className="p-2 space-y-1">
            {members.map((dn) => (
              <div
                key={dn}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted group"
                title={dn}
              >
                <Badge variant="secondary" className="shrink-0">
                  Member
                </Badge>
                <span className="truncate flex-1">{cnFromDn(dn)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => onRemoveMember(dn)}
                  title="Remove member"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Enter member DN..."
          value={newMemberDn}
          onChange={(e) => setNewMemberDn(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={!newMemberDn.trim()}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </div>
    </div>
  )
}
