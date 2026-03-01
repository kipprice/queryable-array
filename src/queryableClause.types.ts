import type {
  NestedPartial,
  ElemType,
  UnionToIntersection,
} from "./utils.types";

/**-------------------------------------------------------------------------
 * BaseQueryClause
 * -------------------------------------------------------------------------
 * A foundational object that tracks a current value and creates a set of
 * resolving functions to determine whether that current value is considered
 * a match for the query that spawned it.
 *
 * A Query Clause can only be resolved once, but depending on the value under
 * test, it may undergo several chained methods before it is resolved to
 * narrow the specificity of the query.
 *
 * -------------------------------------------------------------------------
 */
export interface BaseQueryClause<T, R = QueryClauseResult<T>> {
  /** whether this clause has been resolved. */
  isResolved: boolean;

  /** whether this clause will resolve to 'true' for non-matches rather than matches */
  isNegated: boolean;

  /** the current value under evaluation */
  value?: T;

  /** when resolved, treat a 'false' result as a match and a 'true' result as a non-match */
  not: QueryClause<T, R>;

  /**
   * check for equality between the current value and the provided comparison
   * value. For objects and arrays, this compares via stringified equality, not
   * reference equality.
   **/
  is: (value: T | null | undefined) => R;

  /** check for equality between the current value and the provided comparison value; synonym for 'is' */
  equals: (value: T | null | undefined) => R;

  /** check for equality between the current value and the provided comparison value; synonym for 'is */
  eq: (value: T | null | undefined) => R;

  /** check if the current value is null */
  isNull: () => R;
  /** check if the current value is undefined */
  isUndefined: () => R;
  /** check if the current value is null or undefined */
  isNullish: () => R;

  /**
   * check if the current value is contained within the provided values. For
   * objects and aeeats, this compares via stringified equality, not reference
   * equality
   */
  in: (value: T[]) => R;

  /**
   * check if the current value, when passed into the provided function,
   * resolves to 'true'
   **/
  satisfies: (fn: (t: T) => boolean) => R;
}

export interface ComparableQueryClause<
  T extends string | number,
  R = QueryClauseResult<T>,
> extends BaseQueryClause<T, R> {
  /** determines whether the current value is greater than the provided value */
  gt: (value: T) => R;
  /** determines whether the current value is greater than the provided value; synonym for 'gt' */
  greaterThan: (value: T) => R;

  /** determines whether the current value is greater than or equal to the provided value */
  gte: (value: T) => R;
  /** determines whether the current value is greater than or equal to the provided value; synonym for 'gte' */
  greaterThanOrEqualTo: (value: T) => R;

  /** determines whether the current value is less than the provided value */
  lt: (value: T) => R;
  /** determines whether the current value is less than the provided value; synonym for 'lt' */
  lessThan: (value: T) => R;

  /** determines whether the current value is less than or equal to the provided value */
  lte: (value: T) => R;
  /** determines whether the current value is less than or equal to the provided value; synonym for 'lte' */
  lessThanOrEqualTo: (value: T) => R;
}

export interface ObjectQueryClause<
  T extends object,
  R = QueryClauseResult<T>,
> extends BaseQueryClause<T, R> {
  /**
   * extracts a particular property from the current value and treats that
   * value at that property as the new current value for subsequent calls
   */
  its: <K extends keyof T>(k: K) => UnionToIntersection<QueryClause<T[K], R>>;

  /**
   * determines if the current value contains all of the data specified in
   * the provided partial value. Unlike `is`, this performs a deep equality
   * check between two objects
   */
  matches: (t: NestedPartial<T>) => R;

  /**
   * determines if the current value is an exact match for the provided value.
   * This is stricter than `matches` in that it requires the provided value to
   * also be full instance of the model
   */
  deepEquals: (t: T) => R;

  /** determins if the object has no keys */
  isEmpty: () => R;
}

export interface ArrayQueryClause<
  T extends Array<unknown>,
  E extends T extends Array<infer E> ? E : never = T extends Array<infer E>
    ? E
    : never,
  R = QueryClauseResult<T>,
> extends BaseQueryClause<T, R> {
  /**
   * considers this array resolved if at least one element in the array resolves
   * to true in the subsequent logic calls
   *
   * @param   label
   *          Functionally unused, but allows deeply nested calls to `some` to
   *          be more human readable by labeling the entity being looped over
   */
  some: (label?: string) => UnionToIntersection<QueryClause<E, R>>;

  /**
   * considers this array resolved if every element in the array resolves to
   * true in the subsequent logic calls before including this element into the
   * query result
   *
   * @param   label
   *          Functionally unused, but allows deeply nested calls to `every` to
   *          be more human readable by labeling the entity being looped over
   */
  every: (label?: string) => UnionToIntersection<QueryClause<E, R>>;

  /**
   * determines whether the provided value is findable within the current value
   * array. Similar to 'is' and 'in', this does a string equality check for
   * the specified value; if a deep match is required, it's preferred to use
   * a combination of 'some' / 'every' and 'matches' (or further filtering
   * logic)
   *
   * @param   t
   *          The element that should be contained within this array
   */
  includes: (t: E) => R;

  /** determins if the array has no elements */
  isEmpty: () => R;
}

export type QueryClause<T, R = QueryClauseResult<T>> =
  T extends Array<unknown>
    ? ArrayQueryClause<T, ElemType<T>, R>
    : T extends object
      ? ObjectQueryClause<T, R>
      : T extends string | number
        ? ComparableQueryClause<T, R>
        : BaseQueryClause<T, R>;

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
export interface QueryClauseResult<T> {
  isResolved: true;
  result: boolean;
}
