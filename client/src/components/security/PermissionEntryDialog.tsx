import { useState } from 'react'
import type { AceEntry } from '@samba-ad/shared'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface PermissionEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ace: AceEntry
  objectName: string
}

const OBJECT_PERMISSIONS = [
  { label: 'Full Control', mask: 0x10000000 },
  { label: 'List Contents', mask: 0x00000004 },
  { label: 'Read All Properties', mask: 0x00000008 },
  { label: 'Write All Properties', mask: 0x00000010 },
  { label: 'Delete', mask: 0x00010000 },
  { label: 'Delete Subtree', mask: 0x00000040 },
  { label: 'Read Permissions', mask: 0x00020000 },
  { label: 'Modify Permissions', mask: 0x00040000 },
  { label: 'Modify Owner', mask: 0x00080000 },
  { label: 'All Validated Writes', mask: 0x00000020 },
  { label: 'All Extended Rights', mask: 0x00000100 },
  { label: 'Create All Child Objects', mask: 0x00000001 },
  { label: 'Delete All Child Objects', mask: 0x00000002 },
] as const

export default function PermissionEntryDialog({
  open,
  onOpenChange,
  ace,
  objectName,
}: PermissionEntryDialogProps) {
  const [activeTab, setActiveTab] = useState('object')

  const isAllow = ace.type === 'allow'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Permission Entry for {objectName}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="object">Object</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-1">
            <TabsContent value="object">
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-[120px_1fr] items-center gap-x-4 gap-y-3">
                  <Label>Name:</Label>
                  <Input value={ace.principalName} readOnly className="bg-muted" />

                  <Label>Apply onto:</Label>
                  <Input value={ace.appliesTo} readOnly className="bg-muted" />
                </div>

                <Label className="text-sm font-medium">Permissions:</Label>
                <ScrollArea className="h-[300px] border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[250px]">Permission</TableHead>
                        <TableHead className="w-[70px] text-center">Allow</TableHead>
                        <TableHead className="w-[70px] text-center">Deny</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {OBJECT_PERMISSIONS.map((perm) => {
                        const hasPermission = (ace.accessMask & perm.mask) !== 0
                        return (
                          <TableRow key={perm.label}>
                            <TableCell className="text-sm">{perm.label}</TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={isAllow && hasPermission}
                                disabled
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={!isAllow && hasPermission}
                                disabled
                              />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="properties">
              <div className="py-12 text-center text-sm text-muted-foreground">
                Property-level permissions detail will be available in a future update.
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
