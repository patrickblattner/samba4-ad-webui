import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { LdapAttribute, AttributeChange } from '@samba-ad/shared'
import { getAttributes, updateAttributes } from '@/api/attributes'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AttributeEditorTabProps {
  dn: string
}

function formatGeneralizedTime(value: string): string {
  // LDAP format: YYYYMMDDHHMMSS.0Z or similar
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/)
  if (!match) return value
  const [, y, m, d, h, min, s] = match
  return `${y}-${m}-${d} ${h}:${min}:${s} UTC`
}

function formatDisplayValue(attr: LdapAttribute): string {
  if (attr.values.length === 0) return '<not set>'
  if (attr.syntax === 'generalizedTime' && attr.values.length === 1) {
    return formatGeneralizedTime(attr.values[0])
  }
  return attr.values.join('; ')
}

export default function AttributeEditorTab({ dn }: AttributeEditorTabProps) {
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({
    queryKey: ['attributes', dn],
    queryFn: () => getAttributes(dn),
    enabled: !!dn,
  })

  const [selectedAttr, setSelectedAttr] = useState<LdapAttribute | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [filter, setFilter] = useState('')

  const attributes = data?.attributes ?? []

  const filteredAttributes = useMemo(() => {
    if (!filter) return attributes
    const lower = filter.toLowerCase()
    return attributes.filter((a) => {
      if (a.name.toLowerCase().includes(lower)) return true
      if (a.values.length === 0 && '<not set>'.includes(lower)) return true
      return false
    })
  }, [attributes, filter])

  // Reset selection when attributes change
  useEffect(() => {
    setSelectedAttr(null)
  }, [dn])

  function handleSelectAttribute(attr: LdapAttribute) {
    setSelectedAttr(attr)
  }

  function handleEditClick() {
    if (!selectedAttr) return
    const isReadOnly = selectedAttr.isReadOnly ?? false
    const isBinarySyntax = selectedAttr.syntax === 'octetString'
      || selectedAttr.syntax === 'securityDescriptor'
      || selectedAttr.syntax === 'sid'
      || selectedAttr.syntax === 'dnBinary'
    if (isBinarySyntax || isReadOnly) return

    // For multi-valued attributes, join with newlines for editing
    setEditValue(selectedAttr.values.join('\n'))
    setEditOpen(true)
  }

  async function handleSave() {
    if (!selectedAttr) return
    setIsSaving(true)
    const singleValued = selectedAttr.isSingleValued ?? false
    const syntax = selectedAttr.syntax ?? 'string'

    try {
      let newValues: string[]

      if (syntax === 'boolean') {
        newValues = editValue ? [editValue] : []
      } else if (syntax === 'integer' || syntax === 'largeInteger' || syntax === 'numericString') {
        newValues = editValue.trim() ? [editValue.trim()] : []
      } else if (singleValued) {
        newValues = editValue.trim() ? [editValue.trim()] : []
      } else {
        newValues = editValue
          .split('\n')
          .map((v) => v.trim())
          .filter((v) => v.length > 0)
      }

      const changes: AttributeChange[] = []

      if (newValues.length === 0) {
        // Delete the attribute (only if it was previously set)
        if (selectedAttr.values.length > 0) {
          changes.push({
            name: selectedAttr.name,
            operation: 'delete',
            values: [],
          })
        }
      } else if (selectedAttr.values.length === 0) {
        // Adding a previously unset attribute
        changes.push({
          name: selectedAttr.name,
          operation: 'add',
          values: newValues,
        })
      } else {
        // Replace existing attribute
        changes.push({
          name: selectedAttr.name,
          operation: 'replace',
          values: newValues,
        })
      }

      if (changes.length > 0) {
        await updateAttributes(dn, changes)
        await queryClient.invalidateQueries({ queryKey: ['attributes', dn] })
      }
      setEditOpen(false)
    } catch (err) {
      console.error('Failed to update attribute:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const isBinarySyntax = selectedAttr?.syntax === 'octetString'
    || selectedAttr?.syntax === 'securityDescriptor'
    || selectedAttr?.syntax === 'sid'
    || selectedAttr?.syntax === 'dnBinary'
  const isReadOnly = selectedAttr?.isReadOnly ?? false

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading attributes...
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-12 text-center text-sm text-destructive">
        Failed to load attributes.
      </div>
    )
  }

  const syntax = selectedAttr?.syntax ?? 'string'
  const singleValued = selectedAttr?.isSingleValued ?? false

  return (
    <div className="space-y-3 py-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Filter attributes..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      <div className="border rounded-md max-h-[480px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Attribute</TableHead>
              <TableHead>Value(s)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAttributes.map((attr) => {
              const isNotSet = attr.values.length === 0
              const displayValue = formatDisplayValue(attr)
              return (
                <TableRow
                  key={attr.name}
                  className={cn(
                    'cursor-pointer text-xs',
                    selectedAttr?.name === attr.name && 'bg-accent',
                  )}
                  onClick={() => handleSelectAttribute(attr)}
                  onDoubleClick={() => {
                    handleSelectAttribute(attr)
                    handleEditClick()
                  }}
                >
                  <TableCell className="py-1 font-mono text-xs">
                    {attr.name}
                  </TableCell>
                  <TableCell className={cn("py-1 text-xs truncate max-w-[300px]", isNotSet && "text-muted-foreground italic")}>
                    {displayValue}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          disabled={!selectedAttr || isBinarySyntax || isReadOnly}
          onClick={handleEditClick}
        >
          Edit
        </Button>
      </div>

      {/* Edit Attribute Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[450px]">
          <DialogHeader>
            <DialogTitle>
              Edit Attribute: {selectedAttr?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            {syntax === 'boolean' ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Select a boolean value, or clear to delete the attribute.
                </p>
                <Select value={editValue} onValueChange={setEditValue}>
                  <SelectTrigger className="font-mono text-sm">
                    <SelectValue placeholder="(not set)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRUE">TRUE</SelectItem>
                    <SelectItem value="FALSE">FALSE</SelectItem>
                  </SelectContent>
                </Select>
                {editValue && (
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setEditValue('')}>
                    Clear value
                  </Button>
                )}
              </>
            ) : syntax === 'integer' ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Enter an integer value. Clear to delete the attribute.
                </p>
                <Input
                  type="number"
                  step={1}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="font-mono text-sm"
                />
              </>
            ) : syntax === 'largeInteger' ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Enter a large integer value (64-bit). Clear to delete the attribute.
                </p>
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="font-mono text-sm"
                  pattern="[0-9-]*"
                />
              </>
            ) : syntax === 'dn' || syntax === 'dnString' ? (
              <>
                <p className="text-xs text-muted-foreground">
                  {singleValued ? 'Enter a distinguished name.' : 'Enter each DN on a separate line.'}
                  {' '}Clear to delete the attribute.
                </p>
                {singleValued ? (
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="font-mono text-sm"
                    placeholder="CN=...,DC=..."
                  />
                ) : (
                  <Textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={5}
                    className="font-mono text-sm"
                    placeholder="CN=...,DC=..."
                  />
                )}
              </>
            ) : syntax === 'generalizedTime' ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Enter time in LDAP format (YYYYMMDDHHMMSS.0Z). Clear to delete the attribute.
                </p>
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="font-mono text-sm"
                  placeholder="20260101000000.0Z"
                />
              </>
            ) : syntax === 'numericString' ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Enter a numeric string. Clear to delete the attribute.
                </p>
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="font-mono text-sm"
                  pattern="[0-9 ]*"
                />
              </>
            ) : singleValued ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Clear the value to delete the attribute.
                </p>
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="font-mono text-sm"
                />
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  For multi-valued attributes, enter each value on a separate line.
                  Clear all values to delete the attribute.
                </p>
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={5}
                  className="font-mono text-sm"
                />
              </>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
