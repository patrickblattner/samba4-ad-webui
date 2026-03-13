import { Input } from '@/components/ui/input'

interface DnPickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  id?: string
}

/**
 * Simple DN selection component.
 * For now, a plain text input for entering/editing a DN.
 * A full tree picker dialog can be added later.
 */
export default function DnPicker({
  value,
  onChange,
  placeholder = 'Enter DN...',
  disabled = false,
  id,
}: DnPickerProps) {
  return (
    <Input
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="font-mono text-xs"
    />
  )
}
