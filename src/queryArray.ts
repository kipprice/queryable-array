import {
  SortOrder,
  type ElemType,
  type Key,
  type NestedPartial,
  type UnionToIntersection,
} from "./_types";
import type { QueryClause } from "./queryClause.types";
import {
  isArray,
  isDefined,
  isFunction,
  isNumber,
  isObjectOrArray,
  isString,
} from "./typeChecks";
import {
  applyLogicToFlattenedGroups,
  flattenWithGroups,
  isDeepEqual,
  isEqual,
  isMatch,
} from "./utils";

/**-------------------------------------------------------------------------
 * QueryArray
 * -------------------------------------------------------------------------
 * Helper to be able to take an array of data and turn it into a user-friendly
 * queryable object. This is an actual class as opposed to a wrapped object
 * so we can continue to take advantage of native array functionality,
 *
 * -------------------------------------------------------------------------
 */
export class QueryArray<T> extends Array<T> {
  protected _originalData: T[];

  public constructor(
    elements: T[],
    originalData?: T[],
    protected _currentLogic: "and" | "or" = "and",
  ) {
    if (isArray(elements)) {
      super(elements.length);
      this._originalData = originalData ?? new Array(elements.length);

      let idx = elements.length;
      while (idx--) {
        this[idx] = elements[idx] as T;
        if (!originalData) {
          this._originalData[idx] = elements[idx] as T;
        }
      }

      // native array methods will call with arguments other than an array; in
      // this case, just pass the data along to the regular constructor
    } else {
      super(elements);
      this._originalData = [];
    }
  }

  /**
   * get the first element in the query array, based on the current query
   */
  public get first() {
    return this[0];
  }

  /**
   * get the last element in the query array, based on the current query
   */
  public get last() {
    return this[this.length - 1];
  }

  /**
   * apply a new query to the array, enusring that only elements that match
   * both the current query and the new query are included
   */
  public get and() {
    return new QueryArray(this, this._originalData, "and");
  }

  /**
   * apply a new query to the array, ensuring that elements that match either
   * the current query or the new query are included (without duplicates)
   */
  public get or() {
    return new QueryArray(this, this._originalData, "or");
  }

  /**
   * Remove any duplicate members of the array, via deep-equality comparison
   *
   * @returns A new QueryArray sans duplicate members
   */
  public unique() {
    return this.uniqueBy((t) => t);
  }

  /**
   * Remove any members of the array that are considered a duplicate via the
   * provided key getter.
   *
   * @param   keyGetter
   *          Either a property name or a function that can be used to get the
   *          value that should be compared for uniqueness
   *
   * @returns A new QueryArray sans duplicate members
   */
  public uniqueBy<X>(keyGetter: keyof T | ((t: T) => X)) {
    const filterByUniqueness = (arr: T[]) => {
      const seenValues: (X | T[keyof T])[] = [];
      const out: T[] = [];
      arr.forEach((t) => {
        const x = isFunction(keyGetter) ? keyGetter(t) : t[keyGetter];
        if (seenValues.find((v) => isDeepEqual(x, v))) {
          return;
        }
        seenValues.push(x);
        out.push(t);
      });
      return out;
    };

    return new QueryArray(
      filterByUniqueness(this),
      filterByUniqueness(this._originalData),
    );
  }

  /**
   * sort the query array by either the value in the specified property or via
   * a function evaluator.
   *
   * @param   sortKeyGetter
   *          The property or function that can retrieve a sortable value from
   *          a given element
   *
   * @param   direction
   *          Whether we should perform an ascending or descending search
   *
   * @returns A sorted version of this query array
   */
  public sortBy(
    sortKeyGetter: keyof T | ((t: T) => string | number),
    direction: "asc" | "desc" = "asc",
  ) {
    const sortFn = (a: T, b: T) => {
      const compA = isFunction(sortKeyGetter)
        ? sortKeyGetter(a)
        : a[sortKeyGetter];
      const compB = isFunction(sortKeyGetter)
        ? sortKeyGetter(b)
        : b[sortKeyGetter];

      if (compA < compB) {
        return direction === "asc"
          ? SortOrder.A_BEFORE_B
          : SortOrder.B_BEFORE_A;
      } else if (compA > compB) {
        return direction === "asc"
          ? SortOrder.B_BEFORE_A
          : SortOrder.A_BEFORE_B;
      } else {
        return SortOrder.EQUAL;
      }
    };

    // apply the sort both to our current value and our original values,
    // so we can preserve sort order when the sort occurs before an 'or'
    // if (this instanceof QueryArray) {
    return new QueryArray(this.sort(sortFn), this._originalData.sort(sortFn));
  }

  public joinWith<U>(them: U[]) {
    return {
      /** a key on the current array that references a value in the provided array */
      via: <KT extends keyof T>(myKey: KT) => {
        return {
          /** a key on the provided array that will have the same value as the
           * result of retrieving the above key */
          whichReferences: <KU extends keyof U>(theirKey: KU) => {
            return {
              /**
               * what key on the original element the joined value / values
               * should be persisted to
               *
               * @param   joinKey
               *          A new or existing key for type T that the data that
               *          was joined will be added to
               *
               * @returns A new QueryArray with objects that contain the joined
               *          data
               */
              storedTo: <
                K extends string | number,
                TU extends T & {
                  [k in K]?: T[KT] extends Array<unknown> ? U[] : U;
                },
              >(
                joinKey: K,
              ) => {
                const joinFn = (arr: T[]) => {
                  return arr.map((t) => {
                    const myData = t[myKey];
                    if (isArray(myData)) {
                      return {
                        ...t,
                        [joinKey]: myData.map((uId) =>
                          them.find((u) => u[theirKey] === uId),
                        ),
                      } as TU;
                    } else {
                      return {
                        ...t,
                        [joinKey]: them.find(
                          (u) =>
                            (u[theirKey] as unknown) === (t[myKey] as unknown),
                        ),
                      } as TU;
                    }
                  });
                };

                return new QueryArray<TU>(
                  joinFn(this),
                  joinFn(this._originalData),
                );
              },
            };
          },
        };
      },
    };
  }

  /**
   * turn this query array into a map, with keys based on the provided key
   * getter.
   *
   * This assumes that the key retrieved is unique for the element in
   * question; if multiple elements could return the same key, use `groupBy`
   * instead
   *
   * @param   keyGetter
   *          A function or name of a property that can extract an appropriate
   *          key for any given element.
   *
   * @returns A map of the query array, keyed by the results of the keyGetter
   */
  public indexBy(keyGetter: keyof T | ((t: T) => Key)) {
    return this.reduce(
      (acc, cur) => ({
        ...acc,
        [isFunction(keyGetter) ? keyGetter(cur) : (cur[keyGetter] as Key)]: cur,
      }),
      {} as Record<Key, T>,
    );
  }

  /**
   * group all elements in the query array by a given key
   *
   * @param   keyGetter
   *          The property name or function to retrieve the value
   *
   * @returns A map with keys based on the results of keyGetter and an array
   *          of values that returned that key
   */
  public groupBy(keyGetter: keyof T | ((t: T) => Key | Key[])) {
    return this.reduce(
      (acc, cur) => {
        const keyOrArr = isFunction(keyGetter)
          ? keyGetter(cur)
          : (cur[keyGetter] as Key);
        const keyArr = isArray(keyOrArr) ? keyOrArr : [keyOrArr];

        const out = {
          ...acc,
        };
        for (const key of keyArr) {
          out[key] = [...(out[key] ?? []), cur];
        }
        return out;
      },
      {} as Record<Key, T[]>,
    );
  }

  /**
   * extract inner data from this query array and turn it into a QueryArray of
   * its own. Will automatically flatten data if the result of the key getter
   * is an array.
   *
   * @param   keyGetter
   *          The key to extract to get the appropriate inner data
   */
  public extract<K extends keyof T, X extends T[K]>(
    keyGetter: K,
  ): QueryArray<X extends Array<unknown> ? ElemType<X> : X>;

  /**
   * extract inner data from this query array and turn it into a QueryArray of
   * its own. Will automatically flatten data if the result of the key getter
   * is an array.
   *
   * @param   keyGetter
   *          The function through which to get the appropriate inner data
   */
  public extract<X>(
    keyGetter: (t: T) => X,
  ): QueryArray<X extends Array<unknown> ? ElemType<X> : X>;

  /**
   * extract inner data from this query array and turn it into a QueryArray of
   * its own. Will automatically flatten data if the result of the key getter
   * is an array.
   */
  public extract<X>(keyGetter: keyof T | ((t: T) => X)) {
    return new QueryArray<X>(
      this.flatMap((t) =>
        isFunction(keyGetter) ? keyGetter(t) : (t[keyGetter] as X),
      ).filter((x) => !!x),
      this._originalData
        .flatMap((t) =>
          isFunction(keyGetter) ? keyGetter(t) : (t[keyGetter] as X),
        )
        .filter((x) => !!x),
    );
  }

  /**
   * start filtering the array to elements that have a particular value for the
   * specified property name.
   *
   * @param   propertyName
   *          The property to extract from each element to perform further
   *          queries on
   *
   * @returns A chainable QueryClause that can be resolved to filter the array
   */
  public where<K extends keyof T, X extends T[K]>(
    propertyName: K,
  ): UnionToIntersection<QueryClause<X, QueryArray<T>>>;

  /**
   * start filtering the array to elements that have a particualr value when
   * passed through the specified extract function.
   *
   * @param   extractFn
   *          The function to perform on each element in the array to get the
   *          value that can have further queries performed on
   *
   * @returns A chainable QueryClause that can be resolved to filter the array
   */
  public where<X>(
    extractFn: (t: T) => X,
  ): UnionToIntersection<QueryClause<X, QueryArray<T>>>;

  /**
   * start filtering the array to elements that have a particualr value when
   * passed through the specified extract function.
   */
  public where<X>(keyOrFn: keyof T | ((t: T) => X)) {
    return this._innerWhere(keyOrFn);
  }

  /**
   * perform a where query either on a caller-specified getter or via a set of
   * query clauses that have already been queued up for our use by a previous
   * iteration of the query array
   *
   * @param   keyOrFn
   *          The method through which we should retrieve values for this query
   *          array. Ignored if `myQueryClauses` is set.
   *
   * @param   myQueryClauses
   *          If available, previous iterations of running this query arrays
   *          values through a value extraction, then passed on to a query
   *          clause. Largely used in cases when we are working with deeply
   *          nested arrays or objects, as they have special handling built
   *          into the query clause object to resolve deeply with type safety
   *
   * @returns A new QueryClause that can be resolved to filter the query array
   *          down based on further chained function calls.
   */
  protected _innerWhere<X>(key: keyof T | ((t: T) => X)) {
    const createResolutionFns = <Z>(
      valueGetter: (t: T) => Z,
      arrayLogic: ("some" | "every")[] = [],
      negated = false,
    ) => {
      type ZE = Z extends Array<unknown> ? ElemType<Z> : Z;

      const _resolve = <Z>(resolver: (z: ZE) => boolean) => {
        const elems =
          this._currentLogic === "and"
            ? this
            : this._originalData.slice(0, this._originalData.length);

        const filteredElems = elems.filter((t) => {
          // automatically include anything that has already been filtered in when using an or operator
          if (this._currentLogic === "or" && this.includes(t)) {
            return true;
          }

          const z = t ? valueGetter(t) : undefined;

          const shouldHandleAsArray = isArray(z) && arrayLogic.length > 0;

          let result;

          if (shouldHandleAsArray) {
            result = applyLogicToFlattenedGroups(
              z as any,
              [...arrayLogic],
              resolver,
            );
          } else {
            result = resolver(z as ZE);
          }

          return negated ? !result : result;
        });

        return new QueryArray(filteredElems, this._originalData);
      };

      const out = {
        is: (y: ZE | null | undefined) => _resolve((z: ZE) => isEqual(z, y)),
        eq: (y: ZE | null | undefined) => out.is(y as any),
        equals: (y: ZE | null | undefined) => out.is(y as any),

        isNull: () => _resolve((z: ZE) => isEqual(z, null)),
        isUndefined: () => _resolve((z: ZE) => isEqual(z, undefined)),
        isNullish: () => _resolve((z: ZE) => !isDefined(z)),

        in: (ys: ZE[]) => _resolve((z: ZE) => !!ys.find((y) => isEqual(z, y))),

        satisfies: (fn: (z: ZE) => boolean) => _resolve(fn),

        greaterThan: (y: ZE) =>
          _resolve((z: ZE) => {
            if (isNumber(z) || isString(z)) {
              return z > y;
            } else {
              return false;
            }
          }),
        gt: (y: ZE) => (out as any).greaterThan(y),

        greaterThanOrEqualTo: (y: Z) =>
          _resolve((z: ZE) => {
            if (isNumber(z) || isString(z)) {
              return z >= y;
            } else {
              return false;
            }
          }),
        gte: (y: ZE) => (out as any).greaterThanOrEqualTo(y),

        lessThan: (y: ZE) =>
          _resolve((z: ZE) => {
            if (isNumber(z) || isString(z)) {
              return z < y;
            } else {
              return false;
            }
          }),
        lt: (y: ZE) => (out as any).lessThan(y),

        lessThanOrEqualTo: (y: ZE) =>
          _resolve((z: ZE) => {
            if (isNumber(z) || isString(z)) {
              return z <= y;
            } else {
              return false;
            }
          }),
        lte: (y: ZE) => (out as any).lessThanOrEqualTo(y),

        matches: (y: NestedPartial<ZE>) =>
          _resolve((z: ZE) => {
            if (isObjectOrArray(z) && isObjectOrArray(y)) {
              return isMatch(z, y);
            } else {
              return false;
            }
          }),

        deepEquals: (y: ZE) =>
          _resolve((z: ZE) => {
            if (isObjectOrArray(z) && isObjectOrArray(y)) {
              return isDeepEqual(z, y);
            } else {
              return false;
            }
          }),

        includes: (y: ElemType<Z>) =>
          _resolve((z: ZE) => {
            if (isArray(z)) {
              return !!z.find((e) => isEqual(y, e));
            } else {
              return false;
            }
          }),
      } as unknown as QueryClause<Z, QueryArray<T>>;

      return out;
    };

    const createNestableResolver = <Z>(
      valueGetter: (t: T) => Z,
      arrayLogic: ("some" | "every")[] = [],
      negated = false,
    ) => {
      const out = {
        ...createResolutionFns(valueGetter, arrayLogic, negated),

        get not() {
          return createNestableResolver(valueGetter, arrayLogic, !negated);
        },

        its: <K extends Z extends Array<unknown> ? keyof ElemType<Z> : keyof Z>(
          prop: K,
        ) => {
          return createNestableResolver(
            (t: T) => {
              const z = valueGetter(t);

              return isArray(z) && arrayLogic
                ? z.map((e) => (e as ElemType<Z>)?.[prop as keyof ElemType<Z>])
                : z?.[prop as keyof Z];
            },
            arrayLogic,
            negated,
          );
        },

        some: () => {
          return createNestableResolver(
            (t) => flattenWithGroups(valueGetter(t) as Array<unknown>),
            [...arrayLogic, "some"],
            negated,
          );
        },

        every: () => {
          return createNestableResolver(
            (t) => flattenWithGroups(valueGetter(t) as Array<unknown>),
            [...arrayLogic, "every"],
            negated,
          );
        },
      } as unknown as QueryClause<Z, QueryArray<T>>;

      return out;
    };

    return createNestableResolver(
      isFunction(key) ? (t) => key(t) as X : (t) => t?.[key] as X,
    );
  }
}
