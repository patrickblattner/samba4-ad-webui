import { create } from 'zustand'

type DialogType =
  | 'createUser'
  | 'createGroup'
  | 'createComputer'
  | 'createOu'
  | 'deleteOu'
  | null

interface DialogState {
  activeDialog: DialogType
  openDialog: (dialog: DialogType) => void
  closeDialog: () => void
}

export const useDialogStore = create<DialogState>((set) => ({
  activeDialog: null,
  openDialog: (dialog) => set({ activeDialog: dialog }),
  closeDialog: () => set({ activeDialog: null }),
}))
