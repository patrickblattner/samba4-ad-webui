import { User, Users, Monitor, HelpCircle, Mail, Loader2 } from 'lucide-react'
import type { ObjectSummary } from '@samba-ad/shared'
import { useObjectList } from '@/hooks/useObjectList'
import { useDirectoryStore } from '@/stores/directoryStore'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

function ObjectIcon({ type }: { type: ObjectSummary['type'] }) {
  const className = 'h-4 w-4 shrink-0'

  switch (type) {
    case 'user':
      return <User className={cn(className, 'text-blue-600')} />
    case 'group':
      return <Users className={cn(className, 'text-amber-600')} />
    case 'computer':
      return <Monitor className={cn(className, 'text-green-600')} />
    case 'contact':
      return <Mail className={cn(className, 'text-purple-600')} />
    default:
      return <HelpCircle className={cn(className, 'text-muted-foreground')} />
  }
}

function typeLabel(type: ObjectSummary['type']): string {
  switch (type) {
    case 'user':
      return 'User'
    case 'group':
      return 'Group'
    case 'computer':
      return 'Computer'
    case 'contact':
      return 'Contact'
    default:
      return 'Unknown'
  }
}

export default function ObjectList() {
  const selectedNode = useDirectoryStore((s) => s.selectedNode)
  const { data, isLoading, error } = useObjectList(selectedNode)

  if (!selectedNode) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a container in the tree to view its objects.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading objects...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive">
        Failed to load objects.
      </div>
    )
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No objects in this container.
      </div>
    )
  }

  return (
    <div className="p-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[280px]">Name</TableHead>
            <TableHead className="w-[100px]">Type</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.data.map((obj) => (
            <TableRow key={obj.dn}>
              <TableCell>
                <div
                  className={cn(
                    'flex items-center gap-2',
                    obj.type === 'user' && obj.enabled === false && 'text-muted-foreground',
                  )}
                >
                  <ObjectIcon type={obj.type} />
                  <span className="truncate">{obj.name}</span>
                  {obj.type === 'user' && obj.enabled === false && (
                    <span className="ml-1 text-xs text-muted-foreground">(disabled)</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {typeLabel(obj.type)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {obj.description ?? ''}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.totalPages > 1 && (
        <div className="mt-2 text-xs text-muted-foreground">
          Page {data.page} of {data.totalPages} ({data.total} objects)
        </div>
      )}
    </div>
  )
}
