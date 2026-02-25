import { QueryArray } from "./queryArray";
import { isArray } from "./typeChecks";

/**----------------------------------------------------------------------------
 * queryable
 * ----------------------------------------------------------------------------
 * Augment an array of data elements (or a single data element, which will
 * subsequently be wrapped in an array) with query helpers that allow for more
 * human-readable filtering and map logic.
 *
 * @param   toBeQueryable
 *          If an array, augments the array with additional functionality that
 *          can be called to directly filter the array. If not an array, first
 *          wraps the element in an array, then augments it to have the same
 *          query functions.
 *
 * @returns An Array-like object that can be used in all places that an array
 *          can be used, but can also be directly filtered.
 *
 * @example
 * // returns an new array containing just the second element
 * queryable([{ id: 1 }, { id: 2 }, { id: 3 }])
 *  .where('id').greaterThan(1)
 *  .and.where('id').lessThan(3)
 *  .and.where('id').satisfies((id) => id % 2 === 0)
 *
 * -------------------------------------------------------------------------
 */
export function queryable<T, E extends T extends Array<infer E> ? E : T>(
  toBeQueryable: T,
) {
  // non arrays get wrapped in an array first; this can help exclude single
  // elements using the same syntax we would for full array filtering
  if (!isArray(toBeQueryable)) {
    return new QueryArray<E>(
      [toBeQueryable as unknown as E],
      [toBeQueryable as unknown as E],
    );

    // arrays are made queryable directly
  } else {
    return new QueryArray<E>(toBeQueryable as E[]);
  }
}

export const ql = queryable;
