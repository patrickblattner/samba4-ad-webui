import { useState } from 'react'
import type { AdUser, UpdateUserRequest } from '@samba-ad/shared'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ProfileTabProps {
  user: AdUser
  draft: UpdateUserRequest
  onChange: (patch: Partial<UpdateUserRequest>) => void
}

export default function ProfileTab({ user, draft, onChange }: ProfileTabProps) {
  const hasHomeDir = !!(draft.homeDirectory ?? user.homeDirectory)
  const hasDrive = !!(draft.homeDrive ?? user.homeDrive)
  const [connectMode, setConnectMode] = useState<'local' | 'connect'>(
    hasDrive ? 'connect' : (hasHomeDir ? 'local' : 'local')
  )

  const driveLetters = 'DEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => `${l}:`)

  return (
    <div className="grid gap-4 py-2">
      <div className="space-y-3">
        <h4 className="text-sm font-medium">User profile</h4>
        <div className="grid grid-cols-[140px_1fr] items-center gap-x-4 gap-y-3 pl-1">
          <Label htmlFor="profilePath">Profile path</Label>
          <Input
            id="profilePath"
            value={draft.profilePath ?? user.profilePath ?? ''}
            onChange={(e) => onChange({ profilePath: e.target.value || null })}
          />

          <Label htmlFor="scriptPath">Logon script</Label>
          <Input
            id="scriptPath"
            value={draft.scriptPath ?? user.scriptPath ?? ''}
            onChange={(e) => onChange({ scriptPath: e.target.value || null })}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium">Home folder</h4>
        <div className="space-y-3 pl-1">
          <div className="flex items-center gap-2">
            <input
              type="radio"
              id="local-path"
              name="homeFolder"
              checked={connectMode === 'local'}
              onChange={() => {
                setConnectMode('local')
                onChange({ homeDrive: null })
              }}
              className="h-4 w-4"
            />
            <Label htmlFor="local-path" className="font-normal">Local path:</Label>
            <Input
              disabled={connectMode !== 'local'}
              value={connectMode === 'local' ? (draft.homeDirectory ?? user.homeDirectory ?? '') : ''}
              onChange={(e) => onChange({ homeDirectory: e.target.value || null })}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="radio"
              id="connect-drive"
              name="homeFolder"
              checked={connectMode === 'connect'}
              onChange={() => setConnectMode('connect')}
              className="h-4 w-4"
            />
            <Label htmlFor="connect-drive" className="font-normal">Connect</Label>
            <select
              disabled={connectMode !== 'connect'}
              value={draft.homeDrive ?? user.homeDrive ?? 'H:'}
              onChange={(e) => onChange({ homeDrive: e.target.value })}
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              {driveLetters.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <Label className="font-normal">to</Label>
            <Input
              disabled={connectMode !== 'connect'}
              value={connectMode === 'connect' ? (draft.homeDirectory ?? user.homeDirectory ?? '') : ''}
              onChange={(e) => onChange({ homeDirectory: e.target.value || null })}
              className="flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
