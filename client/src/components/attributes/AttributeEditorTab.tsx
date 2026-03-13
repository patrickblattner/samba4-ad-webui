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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AttributeEditorTabProps {
  dn: string
}

/** Attributes that should not be edited (DC-controlled / system attributes) */
const READ_ONLY_ATTRIBUTES = new Set([
  // Identity / system
  'objectGUID',
  'objectSid',
  'distinguishedName',
  'name',
  'cn',
  'objectClass',
  'objectCategory',
  'instanceType',
  'sAMAccountType',
  // Timestamps (DC-managed)
  'whenCreated',
  'whenChanged',
  'createTimeStamp',
  'modifyTimeStamp',
  // Replication metadata
  'uSNCreated',
  'uSNChanged',
  // Schema
  'subSchemaSubEntry',
  'structuralObjectClass',
  'subschemaSubentry',
  // Computed
  'dscoremorphcount',
  'sDRightsEffective',
  'msDS-User-Account-Control-Computed',
  'isCriticalSystemObject',
  // Operational that are DC-controlled
  'lastLogon',
  'lastLogonTimestamp',
  'lastLogoff',
  'logonCount',
  'badPasswordTime',
  'badPwdCount',
])

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
    const isBinary = selectedAttr.values.length === 1 && selectedAttr.values[0] === '<Binary>'
    if (isBinary) return
    if (READ_ONLY_ATTRIBUTES.has(selectedAttr.name)) return

    // For multi-valued attributes, join with newlines for editing
    setEditValue(selectedAttr.values.join('\n'))
    setEditOpen(true)
  }

  async function handleSave() {
    if (!selectedAttr) return
    setIsSaving(true)

    try {
      // Split by newlines for multi-valued attributes, filter empty lines
      const newValues = editValue
        .split('\n')
        .map((v) => v.trim())
        .filter((v) => v.length > 0)

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

      await updateAttributes(dn, changes)
      await queryClient.invalidateQueries({ queryKey: ['attributes', dn] })
      setEditOpen(false)
    } catch (err) {
      console.error('Failed to update attribute:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const isBinary = selectedAttr?.values.length === 1 && selectedAttr.values[0] === '<Binary>'
  const isReadOnly = selectedAttr ? READ_ONLY_ATTRIBUTES.has(selectedAttr.name) : false

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
              const displayValue = isNotSet ? '<not set>' : attr.values.join('; ')
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
          disabled={!selectedAttr || isBinary || isReadOnly}
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
