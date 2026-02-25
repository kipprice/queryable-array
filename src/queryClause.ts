import {
  type ElemType,
  type NestedPartial,
  type UnionToIntersection,
} from "./_types";
import { assertIsDefined } from "./assertions";
import {
  baseResolutionFunctions,
  resolutionFunctions,
} from "./queryClause.constants";
import type { QueryClause, QueryClauseResult } from "./queryClause.types";
import { _resolve } from "./queryClause.utils";
import { isArray, isNumber, isObject, isString } from "./typeChecks";
import {
  END_GROUP_DIVIDER,
  flattenWithGroups,
  getKeys,
  isEqual,
  isMatch,
  reLayerGroups,
  START_GROUP_DIVIDER,
} from "./utils";

/**-------------------------------------------------------------------------
 * queryClause
 * -----------------------------------------------------------------------------
 * Simple object wrapper that allows for a type-relevant set of validation
 * functions to be applied. Should not
 *
 * @param   value
 *          The value being wrapped with validators
 *
 * @returns The validatable version of the value
 *
 * -------------------------------------------------------------------------
 */
export function queryClause<T, R = QueryClauseResult<T>>(
  value: T,
): QueryClause<T, R> {
  let _isNegated = false;

  const out = {
    /** take the inverse of any subsequent resolution function */
    not() {
      _isNegated = !_isNegated;
      return out;
    },

    /** check if this clause is currently being negated */
    get isNegated() {
      return _isNegated;
    },

    /** check if this clause has already been resolved */
    get isResolved() {
      return false;
    },

    /** retrieve the value that is being evaluated */
    get value() {
      return value;
    },

    is(comparison: T | null | undefined) {
      return _resolve(isEqual(value, comparison), _isNegated);
    },
    equals(e: T | null | undefined) {
      return out.is(e);
    },
    eq(e: T | null | undefined) {
      return out.is(e);
    },

    isNull() {
      return _resolve(value === null, _isNegated);
    },

    isUndefined() {
      return _resolve(value === undefined, _isNegated);
    },

    isNullish() {
      return _resolve(value === undefined || value === null, _isNegated);
    },

    in(e: T[]) {
      const isIn = !!e.some((x) => JSON.stringify(value) === JSON.stringify(x));
      return _resolve(isIn, _isNegated);
    },

    satisfies(fn: (e: T) => boolean) {
      return _resolve(fn(value), _isNegated);
    },

    ...(isArray(value)
      ? {
          some() {
            return queryClauses(value, "some");
          },
          every() {
            return queryClauses(value, "every");
          },
          includes(t: ElemType<T>) {
            return _resolve(!!value.find((v) => isEqual(v, t)), _isNegated);
          },
        }
      : {}),

    ...(isObject(value)
      ? {
          its(k: keyof T) {
            return queryClause(value[k]);
          },

          matches(e: NestedPartial<T>) {
            return _resolve(isMatch(value, e), _isNegated);
          },
        }
      : {}),

    ...(isString(value) || isNumber(value)
      ? {
          gt(e: T) {
            return _resolve(value > e, _isNegated);
          },
          greaterThan: (e: T) => (out as any).gt(e),

          gte(e: T) {
            return _resolve(value >= e, _isNegated);
          },
          greaterThanOrEqualTo: (e: T) => (out as any).gte(e),

          lt(e: T) {
            return _resolve(value < e, _isNegated);
          },
          lessThan: (e: T) => (out as any).lt(e),

          lte(e: T) {
            return _resolve(value <= e, _isNegated);
          },
          lessThanOrEqualTo: (e: T) => (out as any).lte(e),
        }
      : {}),
  } as QueryClause<T, R>;

  return out;
}

/**-------------------------------------------------------------------------
 * queryClauses
 * -----------------------------------------------------------------------------
 * Simple object wrapper that allows for an array of values that can be
 * validated in aggregate (either with all of the elems needing to match or
 * some of the elems needing to match). This has the same signature of
 * a regular query clause, but accounts for deep nesting of objects and arrays
 * within the provided values
 *
 * @param   values
 *          The values being wrapped with validators
 *
 * @param   logic
 *          Whether all values or some values need to match the validation
 *          that will be applied
 *
 * @param   parentLogic
 *          If this is a deeply nested array, the logic applied at all previous
 *          loops through the array, to ensure we can chain the appropriate
 *          logic through any arbitrary level
 *
 * @returns The validatable version of the value
 *
 * -------------------------------------------------------------------------
 */
export function queryClauses<E, R = QueryClauseResult<E>>(
  values: E[],
  logic: "some" | "every" | "filter",
  parentLogic: ("some" | "every" | "filter")[] = [],
): UnionToIntersection<QueryClause<E, R>> {
  const allQueryClauses = values
    .map((e) =>
      e === START_GROUP_DIVIDER || e === END_GROUP_DIVIDER
        ? undefined
        : queryClause(e),
    )
    .filter((qc) => !!qc);

  let _currentQueryClauses = [...allQueryClauses];
  let _isNegated = false;

  const keysToEnable = [
    ...new Set(allQueryClauses.flatMap((qc) => getKeys(qc))),
  ];

  const _validateLayeredArray = (
    layeredArr: any[],
    validateFn: (e: any) => boolean,
    [myLogic, ...childLogics]: ["some" | "every", ...("some" | "every")[]],
  ): boolean => {
    return layeredArr[myLogic]((e) => {
      if (isArray(e) && childLogics.length > 0) {
        return _validateLayeredArray(
          e,
          validateFn,
          childLogics as ["some" | "every", ...("some" | "every")[]],
        );
      } else {
        return validateFn(e);
      }
    });
  };

  // ensure we can resolve with the relevant functions at every step of the way
  const out = resolutionFunctions.reduce(
    (acc, resolutionFn, idx) => ({
      ...acc,
      ...(keysToEnable.includes(resolutionFn as keyof QueryClause<E>)
        ? {
            [resolutionFn]: (...args: any[]) => {
              const unflattenedData = reLayerGroups(values);
              assertIsDefined(unflattenedData);

              return _resolve(
                _validateLayeredArray(
                  unflattenedData,
                  (e) => {
                    const qc = _currentQueryClauses.find((qc) =>
                      isEqual(qc.value, e),
                    );
                    assertIsDefined(qc);
                    return (qc[resolutionFn as keyof typeof qc] as Function)(
                      ...args,
                    ).result;
                  },
                  [...parentLogic, logic] as unknown as [
                    "some" | "every",
                    ...("some" | "every")[],
                  ],
                ),
                _isNegated,
              );
            },
          }
        : {
            // ensure that we include all resolution functions on the output even
            // if they aren't actually relevant, so that we don't end up in a spot
            // where the type of the query clauses implies we should have a function
            // but in practice (because the array is empty), we do not
            [resolutionFn]: () => _resolve(false, _isNegated),
          }),
    }),
    {
      not() {
        _isNegated = !_isNegated;
        return out;
      },
      get isNegated() {
        return _isNegated;
      },
      get isResolved() {
        return false;
      },
      ...(keysToEnable.includes("some" as keyof QueryClause<E>)
        ? {
            some() {
              const flattenedValues = flattenWithGroups(values);

              return queryClauses(flattenedValues, "some", [
                ...parentLogic,
                logic,
              ]);
            },
          }
        : {}),

      ...(keysToEnable.includes("every" as keyof QueryClause<E>)
        ? {
            every() {
              return queryClauses(flattenWithGroups(values), "every", [
                ...parentLogic,
                logic,
              ]);
            },
          }
        : {}),

      ...(keysToEnable.includes("its" as keyof QueryClause<E>)
        ? {
            its<K extends keyof E>(k: K) {
              return queryClauses(
                values.map((v) => v?.[k]),
                logic,
                parentLogic,
              ) as UnionToIntersection<QueryClause<E[K]>>;
            },
          }
        : {}),
    } as unknown as QueryClause<E, R>,
  ) as UnionToIntersection<QueryClause<E, R>>;

  return out;
}
