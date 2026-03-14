import { useState } from 'react'
import type { SecurityDescriptorInfo, AceEntry } from '@samba-ad/shared'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
import PermissionEntryDialog from './PermissionEntryDialog'

interface AdvancedSecurityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: SecurityDescriptorInfo
  objectName: string
}

export default function AdvancedSecurityDialog({
  open,
  onOpenChange,
  data,
  objectName,
}: AdvancedSecurityDialogProps) {
  const [selectedAce, setSelectedAce] = useState<AceEntry | null>(null)
  const [entryDialogOpen, setEntryDialogOpen] = useState(false)

  function handleRowDoubleClick(ace: AceEntry) {
    setSelectedAce(ace)
    setEntryDialogOpen(true)
  }

  function truncateRights(rights: string[]): string {
    const joined = rights.join(', ')
    if (joined.length > 40) {
      return joined.substring(0, 37) + '...'
    }
    return joined
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[900px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Advanced Security Settings for {objectName}</DialogTitle>
            <DialogDescription>
              To view more information about a special permission, select a permission entry, and then click Edit.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            <Label className="text-sm font-medium">Permission entries:</Label>
            <ScrollArea className="flex-1 border rounded-md h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70px]">Type</TableHead>
                    <TableHead className="w-[180px]">Name</TableHead>
                    <TableHead>Permission</TableHead>
                    <TableHead className="w-[180px]">Inherited From</TableHead>
                    <TableHead className="w-[150px]">Apply To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.dacl.map((ace, index) => (
                    <TableRow
                      key={index}
                      className="cursor-pointer"
                      onDoubleClick={() => handleRowDoubleClick(ace)}
                    >
                      <TableCell className="text-sm capitalize">{ace.type === 'allow' ? 'Allow' : 'Deny'}</TableCell>
                      <TableCell className="text-sm">{ace.principalName}</TableCell>
                      <TableCell className="text-sm">{truncateRights(ace.rights)}</TableCell>
                      <TableCell className="text-sm">{ace.inheritedFrom}</TableCell>
                      <TableCell className="text-sm">{ace.appliesTo}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex items-center gap-2">
              <Checkbox
                id="inheritPermissions"
                checked={data.isInheritanceEnabled}
                disabled
              />
              <Label htmlFor="inheritPermissions" className="text-sm">
                Allow inheritable permissions from the parent to propagate to this object and all child objects. Include these with entries explicitly defined here.
              </Label>
            </div>
          </div>

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

      {selectedAce && (
        <PermissionEntryDialog
          open={entryDialogOpen}
          onOpenChange={setEntryDialogOpen}
          ace={selectedAce}
          objectName={objectName}
        />
      )}
    </>
  )
}
