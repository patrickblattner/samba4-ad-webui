import type { AdGroup, UpdateGroupRequest } from '@samba-ad/shared'
import { GROUP_TYPE } from '@samba-ad/shared'
import type { GroupScope, GroupCategory } from '@samba-ad/shared'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface GeneralTabProps {
  group: AdGroup
  draft: UpdateGroupRequest
  onChange: (patch: Partial<UpdateGroupRequest>) => void
  scopeOverride: GroupScope | null
  categoryOverride: GroupCategory | null
  onScopeChange: (scope: GroupScope) => void
  onCategoryChange: (category: GroupCategory) => void
}

function getScope(groupType: number): GroupScope {
  if (groupType & GROUP_TYPE.UNIVERSAL) return 'universal'
  if (groupType & GROUP_TYPE.DOMAIN_LOCAL) return 'domainLocal'
  return 'global'
}

function getCategory(groupType: number): GroupCategory {
  if (groupType & GROUP_TYPE.SECURITY) return 'security'
  return 'distribution'
}

export default function GeneralTab({
  group,
  draft,
  onChange,
  scopeOverride,
  categoryOverride,
  onScopeChange,
  onCategoryChange,
}: GeneralTabProps) {
  const currentScope = scopeOverride ?? getScope(group.groupType)
  const currentCategory = categoryOverride ?? getCategory(group.groupType)

  return (
    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-[140px_1fr] items-center gap-x-4 gap-y-3">
        <Label htmlFor="group-name">Group name (pre-Windows 2000)</Label>
        <Input
          id="group-name"
          value={group.sAMAccountName}
          disabled
        />

        <Label htmlFor="group-description">Description</Label>
        <Input
          id="group-description"
          value={draft.description ?? group.description ?? ''}
          onChange={(e) => onChange({ description: e.target.value || null })}
        />

        <Label htmlFor="group-email">E-mail</Label>
        <Input
          id="group-email"
          value={draft.mail ?? group.mail ?? ''}
          onChange={(e) => onChange({ mail: e.target.value || null })}
        />
      </div>

      <div className="grid grid-cols-2 gap-6 mt-2">
        <div>
          <Label className="mb-2 block">Group scope</Label>
          <RadioGroup value={currentScope} onValueChange={(v) => onScopeChange(v as GroupScope)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="domainLocal" id="scope-domainLocal" />
              <Label htmlFor="scope-domainLocal" className="font-normal">Domain local</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="global" id="scope-global" />
              <Label htmlFor="scope-global" className="font-normal">Global</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="universal" id="scope-universal" />
              <Label htmlFor="scope-universal" className="font-normal">Universal</Label>
            </div>
          </RadioGroup>
        </div>

        <div>
          <Label className="mb-2 block">Group type</Label>
          <RadioGroup value={currentCategory} onValueChange={(v) => onCategoryChange(v as GroupCategory)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="security" id="type-security" />
              <Label htmlFor="type-security" className="font-normal">Security</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="distribution" id="type-distribution" />
              <Label htmlFor="type-distribution" className="font-normal">Distribution</Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      <div className="mt-2">
        <Label htmlFor="group-notes">Notes</Label>
        <Textarea
          id="group-notes"
          value={draft.info ?? group.info ?? ''}
          onChange={(e) => onChange({ info: e.target.value || null })}
          className="mt-1"
          rows={3}
        />
      </div>
    </div>
  )
}
