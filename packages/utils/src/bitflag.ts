interface FlagOperation {
  mask: number;
  flag: number;
}

export const setFlag = (operation: FlagOperation) =>
  operation.mask | operation.flag;

export const removeFlag = (operation: FlagOperation) =>
  operation.mask & ~operation.flag;

export const hasFlag = (operation: FlagOperation) =>
  operation.mask & operation.flag;

export const toggleFlag = (operation: FlagOperation) =>
  operation.mask ^ operation.flag;
