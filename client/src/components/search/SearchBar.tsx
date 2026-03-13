import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, User, Users, Monitor, Loader2, X } from 'lucide-react'
import type { ObjectSummary } from '@samba-ad/shared'
import { useSearch } from '@/hooks/useSearch'
import { useDirectoryStore } from '@/stores/directoryStore'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

function ResultIcon({ type }: { type: ObjectSummary['type'] }) {
  const className = 'h-4 w-4 shrink-0'
  switch (type) {
    case 'user':
      return <User className={cn(className, 'text-blue-600')} />
    case 'group':
      return <Users className={cn(className, 'text-amber-600')} />
    case 'computer':
      return <Monitor className={cn(className, 'text-green-600')} />
    default:
      return <Search className={cn(className, 'text-muted-foreground')} />
  }
}

function typeLabel(type: ObjectSummary['type']): string {
  switch (type) {
    case 'user': return 'User'
    case 'group': return 'Group'
    case 'computer': return 'Computer'
    case 'contact': return 'Contact'
    default: return 'Unknown'
  }
}

/**
 * Extract the parent container DN from an object DN.
 * e.g. "CN=John,OU=Users,DC=lab,DC=dev" -> "OU=Users,DC=lab,DC=dev"
 */
function getParentDn(dn: string): string {
  const idx = dn.indexOf(',')
  if (idx === -1) return dn
  return dn.substring(idx + 1)
}

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { selectNode, expandNode } = useDirectoryStore()
  const { data, isLoading } = useSearch(debouncedQuery)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // Open dropdown when there are results
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      setIsOpen(true)
      setHighlightedIndex(-1)
    } else {
      setIsOpen(false)
    }
  }, [debouncedQuery])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const results = data?.data ?? []

  const navigateToResult = useCallback((obj: ObjectSummary) => {
    const parentDn = getParentDn(obj.dn)

    // Expand all ancestors and select the parent container
    const parts = parentDn.split(',')
    for (let i = parts.length - 1; i >= 0; i--) {
      const ancestorDn = parts.slice(i).join(',')
      expandNode(ancestorDn)
    }

    selectNode(parentDn)
    setIsOpen(false)
    setQuery('')
    setDebouncedQuery('')
  }, [selectNode, expandNode])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) => Math.min(prev + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          navigateToResult(results[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        inputRef.current?.blur()
        break
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search objects..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (debouncedQuery.trim().length >= 2) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          className="h-7 w-[240px] pl-7 pr-7 text-xs"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('')
              setDebouncedQuery('')
              setIsOpen(false)
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[360px] rounded-md border bg-popover shadow-md">
          {isLoading && (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          )}

          {!isLoading && results.length === 0 && debouncedQuery.trim().length >= 2 && (
            <div className="px-3 py-4 text-sm text-muted-foreground">
              No results found.
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <div className="max-h-[300px] overflow-auto py-1">
              {results.map((obj, idx) => (
                <button
                  key={obj.dn}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent',
                    highlightedIndex === idx && 'bg-accent',
                  )}
                  onClick={() => navigateToResult(obj)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                >
                  <ResultIcon type={obj.type} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{obj.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {typeLabel(obj.type)}
                      {obj.description ? ` - ${obj.description}` : ''}
                    </div>
                  </div>
                </button>
              ))}
              {data && data.total > results.length && (
                <div className="px-3 py-1.5 text-xs text-muted-foreground">
                  Showing {results.length} of {data.total} results
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
