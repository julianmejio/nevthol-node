export interface FlagOperation {
  mask: number;
  flag: number;
}

export const set = (operation: FlagOperation) =>
  operation.mask | operation.flag;

export const unset = (operation: FlagOperation) =>
  operation.mask & ~operation.flag;

export const toggle = (operation: FlagOperation) =>
  operation.mask ^ operation.flag;

export const has = (operation: FlagOperation) =>
  (operation.mask & operation.flag) === operation.flag;

export const Bitmask = { set, unset, toggle, has };
