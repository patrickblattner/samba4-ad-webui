import { create } from 'zustand'

interface DirectoryState {
  selectedNode: string | null
  expandedNodes: Set<string>
  selectNode: (dn: string) => void
  toggleNode: (dn: string) => void
  expandNode: (dn: string) => void
  collapseNode: (dn: string) => void
}

export const useDirectoryStore = create<DirectoryState>((set) => ({
  selectedNode: null,
  expandedNodes: new Set<string>(),

  selectNode: (dn) => set({ selectedNode: dn }),

  toggleNode: (dn) =>
    set((state) => {
      const next = new Set(state.expandedNodes)
      if (next.has(dn)) {
        next.delete(dn)
      } else {
        next.add(dn)
      }
      return { expandedNodes: next }
    }),

  expandNode: (dn) =>
    set((state) => {
      if (state.expandedNodes.has(dn)) return state
      const next = new Set(state.expandedNodes)
      next.add(dn)
      return { expandedNodes: next }
    }),

  collapseNode: (dn) =>
    set((state) => {
      if (!state.expandedNodes.has(dn)) return state
      const next = new Set(state.expandedNodes)
      next.delete(dn)
      return { expandedNodes: next }
    }),
}))
