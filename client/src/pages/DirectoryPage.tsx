import AppShell from '@/components/layout/AppShell'
import DirectoryLayout from '@/components/layout/DirectoryLayout'
import DirectoryTree from '@/components/tree/DirectoryTree'
import ObjectList from '@/components/objects/ObjectList'

export default function DirectoryPage() {
  return (
    <AppShell>
      <DirectoryLayout sidebar={<DirectoryTree />}>
        <ObjectList />
      </DirectoryLayout>
    </AppShell>
  )
}
