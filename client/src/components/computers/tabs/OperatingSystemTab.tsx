import type { AdComputer } from '@samba-ad/shared'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface OperatingSystemTabProps {
  computer: AdComputer
}

export default function OperatingSystemTab({ computer }: OperatingSystemTabProps) {
  return (
    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-[140px_1fr] items-center gap-x-4 gap-y-3">
        <Label htmlFor="os-name">Operating System</Label>
        <Input
          id="os-name"
          value={computer.operatingSystem ?? ''}
          disabled
        />

        <Label htmlFor="os-version">Version</Label>
        <Input
          id="os-version"
          value={computer.operatingSystemVersion ?? ''}
          disabled
        />

        <Label htmlFor="os-sp">Service Pack</Label>
        <Input
          id="os-sp"
          value={computer.operatingSystemServicePack ?? ''}
          disabled
        />
      </div>
    </div>
  )
}
