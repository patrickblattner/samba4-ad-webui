import { UAC_FLAGS } from '@samba-ad/shared'

/** Check if a UAC bitmask has a specific flag set */
export const hasFlag = (uac: number, flag: number): boolean =>
  (uac & flag) === flag

/** Set a flag in a UAC bitmask */
export const setFlag = (uac: number, flag: number): number =>
  uac | flag

/** Clear a flag from a UAC bitmask */
export const clearFlag = (uac: number, flag: number): number =>
  uac & ~flag

/** Check if the ACCOUNTDISABLE flag is set */
export const isDisabled = (uac: number): boolean =>
  hasFlag(uac, UAC_FLAGS.ACCOUNTDISABLE)
