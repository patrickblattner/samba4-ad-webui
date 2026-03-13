import type { ReactNode } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface DirectoryLayoutProps {
  sidebar: ReactNode
  children: ReactNode
}

export default function DirectoryLayout({ sidebar, children }: DirectoryLayoutProps) {
  return (
    <div className="flex h-full">
      <div className="w-[280px] shrink-0 border-r">
        <ScrollArea className="h-full">
          <div className="p-2">{sidebar}</div>
        </ScrollArea>
      </div>
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
