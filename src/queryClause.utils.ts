import type { QueryClauseResult } from "./queryClause.types";

export function _resolve<T>(result: boolean, isNegated: boolean) {
  return {
    get isResolved() {
      return true;
    },
    get result() {
      return isNegated ? !result : result;
    },
  } as QueryClauseResult<T>;
}
