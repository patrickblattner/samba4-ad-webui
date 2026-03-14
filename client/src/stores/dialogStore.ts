import { create } from 'zustand'

type DialogType =
  | 'createUser'
  | 'createGroup'
  | 'createComputer'
  | 'createOu'
  | 'deleteOu'
  | 'renameOu'
  | 'moveOu'
  | 'ouProperties'
  | null

interface DialogState {
  activeDialog: DialogType
  targetDn: string | null
  targetName: string | null
  openDialog: (dialog: DialogType, target?: { dn: string; name: string }) => void
  closeDialog: () => void
}

export const useDialogStore = create<DialogState>((set) => ({
  activeDialog: null,
  targetDn: null,
  targetName: null,
  openDialog: (dialog, target) => set({
    activeDialog: dialog,
    targetDn: target?.dn ?? null,
    targetName: target?.name ?? null,
  }),
  closeDialog: () => set({
    activeDialog: null,
    targetDn: null,
    targetName: null,
  }),
}))
