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
import {
  SortOrder,
  type ElemType,
  type Key,
  type NestedPartial,
  type UnionToIntersection,
} from "./_types";
import { assert } from "./assertions";

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
  protected __currentData: T[];
  protected _originalData: T[];

  [idx: number]: T;

  /** ensure that we instantiate intermediate versions of query arrays (e.g.
   * through .filter or .map) as a straight array instance -- we will always
   * explicitly wrap the result in a QueryArray when appropriate */
  static get [Symbol.species]() {
    return Array;
  }

  protected get _currentData() {
    return this.__currentData;
  }

  protected set _currentData(d: T[]) {
    this.__currentData = d;
    this._populateInnerStore();
  }

  public constructor(
    elements: T[],
    originalData?: T[],
    protected _currentLogic: "and" | "or" = "and",

    /** the set of currently included elems, if relevant -- used to improve performance of OR queries */
    protected _currentSet: Set<T> = new Set(),
  ) {
    assert(isArray(elements));
    super(elements.length);
    this.__currentData = elements;
    this._originalData = originalData ?? elements.slice(0, elements.length);

    // ensure that the QueryArray behaves like a regular array, but largely
    // through passing through to the current value of _currentData
    this._populateInnerStore();
  }

  /**
   * ensure that we have the elements from _currentData also populated into our
   * numeric indices, so that you can extract data as you would from a regular
   * array
   **/
  protected _populateInnerStore() {
    this.__currentData.forEach((e, idx) => {
      this[idx] = e;
    });

    this.length = this.__currentData.length;
  }

  /**
   * even though we're inheriting from an array, to actually keep things
   * performant, we pass all direct Array method calls onto the _currentData
   * array via augmenting our object directly.
   */
  protected _cloneArrayMethods() {
    var keys = [];
    var obj = [];
    do {
      keys.push(...Object.getOwnPropertyNames(obj));
    } while ((obj = Object.getPrototypeOf(obj)));

    for (const k of keys) {
      if (isFunction((this.__currentData as any)[k])) {
        (this as any)[k] = (...args: any[]) =>
          (this.__currentData as any)[k](...args);
      }
    }
  }

  /**
   * get the first element in the query array, based on the current query
   */
  public get first() {
    return this._currentData[0];
  }

  /**
   * get the last element in the query array, based on the current query
   */
  public get last() {
    return this._currentData[this._currentData.length - 1];
  }

  /**
   * apply a new query to the array, enusring that only elements that match
   * both the current query and the new query are included
   */
  public get and() {
    this._currentLogic = "and";
    this._currentSet = new Set();
    return this;
  }

  /**
   * apply a new query to the array, ensuring that elements that match either
   * the current query or the new query are included (without duplicates)
   */
  public get or() {
    this._currentLogic = "or";
    return this;
  }

  /**
   * Remove any duplicate members of the array, via deep-equality comparison
   *
   * @returns This QueryArray sans duplicate members
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
   * @returns This QueryArray sans duplicate members
   */
  public uniqueBy<X>(keyGetter: keyof T | ((t: T) => X)) {
    const filterByUniqueness = (arr: T[]) => {
      const seenValues: Record<string, true> = {};
      const out: T[] = [];
      arr.forEach((t) => {
        const x = isFunction(keyGetter) ? keyGetter(t) : t[keyGetter];
        const stringified = JSON.stringify(x);
        if (seenValues[stringified]) {
          return;
        }
        seenValues[stringified] = true;
        out.push(t);
      });
      return out;
    };

    this._currentData = filterByUniqueness(this._currentData);
    this._originalData = filterByUniqueness(this._originalData);
    return this;
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
    const valueGetter = (t: T) =>
      isFunction(sortKeyGetter) ? sortKeyGetter(t) : t[sortKeyGetter];

    const sortFn = (a: T, b: T) => {
      const compA = valueGetter(a);
      const compB = valueGetter(b);

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
    this._currentData = [...this._currentData].sort(sortFn);
    this._originalData = [...this._originalData].sort(sortFn);

    return this;
  }

  /**
   * combine two arrays via a shared key and return a new QueryArray of the
   * joined version of the model
   *
   * @param   them
   *          Elements to join with the current
   *
   * @returns A chainable joiner that can be used to set a new key to the
   *          result of the join
   */
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

                // we return a true new query array here because the types have
                // now changed
                return new QueryArray<TU>(
                  joinFn(this._currentData),
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
    const out: Record<Key, T> = {};

    const valueGetter = (t: T) =>
      isFunction(keyGetter) ? keyGetter(t) : (t?.[keyGetter] as Key);

    this._currentData.forEach((t) => {
      out[valueGetter(t)] = t;
    });

    return out;
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
    const out: Record<Key, T[]> = {};

    const valueGetter = (t: T) =>
      isFunction(keyGetter) ? keyGetter(t) : (t?.[keyGetter] as Key);

    this._currentData.forEach((t) => {
      const x = valueGetter(t);
      const keys = isArray(x) ? x : [x];

      for (const k of keys) {
        if (!out[k]) {
          out[k] = [];
        }
        out[k].push(t);
      }
    });

    return out;
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
      this._currentData
        .flatMap((t) =>
          isFunction(keyGetter) ? keyGetter(t) : (t[keyGetter] as X),
        )
        .filter((x) => !!x),
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
  public where<X>(key: keyof T | ((t: T) => X)) {
    const createResolutionFns = <Z>(
      valueGetter: (t: T) => Z,
      arrayLogic: ("some" | "every")[] = [],
      negated = false,
    ) => {
      type ZE = Z extends Array<unknown> ? ElemType<Z> : Z;

      const _resolve = <Z>(resolver: (z: ZE) => boolean) => {
        const elems =
          this._currentLogic === "and" ? this._currentData : this._originalData;

        const filteredElems = elems.filter((t) => {
          if (this._currentSet.has(t)) {
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

          const resultWithNegation = negated ? !result : result;
          if (resultWithNegation) {
            this._currentSet.add(t);
          }
          return resultWithNegation;
        });

        this._currentData = filteredElems;
        return this;
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

  // =========================================
  // OVERRIDDEN ARRAY METHODS RETURNING ARRAYS
  // =========================================
  // These are methods that in a native array, will return another array.
  // These will be wrapped in a QueryArray instead, after being performed on
  // the native _currentData array

  public map<U>(fn: (t: T, idx: number, arr: T[]) => U) {
    const mappedData = this._currentData.map<U>(fn);
    return new QueryArray(mappedData);
  }

  public filter(...args: Parameters<Array<T>["filter"]>) {
    return new QueryArray(
      this._currentData.filter(...args),
      this._originalData,
      this._currentLogic,
      this._currentSet,
    );
  }

  public concat(...args: Parameters<Array<T>["concat"]>) {
    return new QueryArray(this._currentData.concat(...args));
  }

  public slice(...args: Parameters<Array<T>["slice"]>) {
    return new QueryArray(this._currentData.slice(...args));
  }

  public flat<A, D extends number = 1>(
    this: A,
    depth?: D | undefined,
  ): FlatArray<A, D>[] {
    return new QueryArray(
      (this as QueryArray<T>)._currentData.flat<T[], D>(depth),
    ) as FlatArray<A, D>[];
  }

  public flatMap<U>(
    callback: (value: T, index: number, array: T[]) => U | readonly U[],
  ): U[] {
    return new QueryArray(this._currentData.flatMap<U>(callback));
  }

  public with(...args: Parameters<Array<T>["with"]>) {
    return new QueryArray(this._currentData.with(...args));
  }

  public toSorted(...args: Parameters<Array<T>["toSorted"]>) {
    return new QueryArray(
      this._currentData.toSorted(...args),
      this._originalData.toSorted(...args),
      this._currentLogic,
      this._currentSet,
    );
  }

  public toReversed() {
    return new QueryArray(
      this._currentData.toReversed(),
      this._originalData.toReversed(),
      this._currentLogic,
      this._currentSet,
    );
  }

  public toSpliced(...args: Parameters<Array<T>["toSpliced"]>) {
    return new QueryArray(
      this._currentData.toSpliced(...args),
      this._originalData,
      this._currentLogic,
      this._currentSet,
    );
  }

  // ===========================================
  // OVERRIDDEN IN-PLACE MODIFYING ARRAY METHODS
  // ===========================================
  // These are methods that operate directly on the current array reference
  // rather than returning a new copy of the array with the operation performed.
  // We perform these methods on the native _currentData array, then update
  // our inner store to reflect the updates to the _currentData array before
  // returning an appropriate result for the method.
  public fill(...args: Parameters<Array<T>["fill"]>) {
    this._currentData.fill(...args);
    this._populateInnerStore();
    return this;
  }

  public sort(...args: Parameters<Array<T>["sort"]>) {
    this._currentData.sort(...args);
    this._populateInnerStore();
    this._originalData.sort(...args);
    return this;
  }

  public reverse() {
    this._currentData.reverse();
    this._populateInnerStore();
    this._originalData.reverse();
    return this;
  }

  public splice(...args: Parameters<Array<T>["splice"]>) {
    const out = this._currentData.splice(...args);
    this._populateInnerStore();
    return out;
  }

  public copyWithin(target: number, start: number, end?: number) {
    this._currentData.copyWithin(target, start, end);
    this._populateInnerStore();
    return this;
  }

  // =========================================
  // OVERRIDDEN ARRAY METHODS FOR OPTIMIZATION
  // =========================================
  // These are methods that we anticipate being slower when run directly on a
  // QueryArray, as a result of the optimization that our semi-custom
  // implementation requires. These pass through the function call to our
  // _currentData array to take advantage of the optimized versions
  public includes(...args: Parameters<Array<T>["includes"]>) {
    return this._currentData.includes(...args);
  }

  public find<U>(predicate: (value: T, index: number, obj: T[]) => U) {
    return this._currentData.find(predicate);
  }

  public findIndex<U>(
    predicate: (value: T, index: number, obj: T[]) => U,
  ): number {
    return this._currentData.findIndex(predicate);
  }

  public findLast<U>(predicate: (value: T, index: number, obj: T[]) => U) {
    return this._currentData.findLast(predicate);
  }

  public findLastIndex<U>(
    predicate: (value: T, index: number, obj: T[]) => U,
  ): number {
    return this._currentData.findLastIndex(predicate);
  }

  public indexOf(...args: Parameters<Array<T>["indexOf"]>) {
    return this._currentData.indexOf(...args);
  }

  public lastIndexOf(...args: Parameters<Array<T>["lastIndexOf"]>) {
    return this._currentData.lastIndexOf(...args);
  }

  public forEach(...args: Parameters<Array<T>["forEach"]>) {
    return this._currentData.forEach(...args);
  }

  public every<S extends T>(predicate: (t: T) => t is S): this is S[] {
    return this._currentData.every(predicate);
  }

  public some(...args: Parameters<Array<T>["some"]>) {
    return this._currentData.some(...args);
  }

  public reduce(callbackFn: (acc: T, cur: T, idx: number, arr: T[]) => T): T;
  public reduce(
    callbackFn: (acc: T, cur: T, idx: number, arr: T[]) => T,
    initialValue: T,
  ): T;
  public reduce<U>(
    callbackFn: (acc: U, cur: T, idx: number, arr: T[]) => U,
    initialValue: U,
  ): U;
  public reduce<U>(
    callbackfn: (acc: T | U, cur: T, idx: number, arr: T[]) => T | U,
    initialValue?: T | U,
  ): T | U {
    return this._currentData.reduce(callbackfn as any, initialValue) as T | U;
  }

  public reduceRight(
    callbackFn: (acc: T, cur: T, idx: number, arr: T[]) => T,
  ): T;
  public reduceRight(
    callbackFn: (acc: T, cur: T, idx: number, arr: T[]) => T,
    initialValue: T,
  ): T;
  public reduceRight<U>(
    callbackFn: (acc: U, cur: T, idx: number, arr: T[]) => U,
    initialValue: U,
  ): U;
  public reduceRight<U>(
    callbackfn: (acc: T | U, cur: T, idx: number, arr: T[]) => T | U,
    initialValue?: T | U,
  ): T | U {
    return this._currentData.reduceRight(callbackfn as any, initialValue) as
      | T
      | U;
  }

  // ==========================================
  // OVERRIDDEN ARRAY METHODS FOR FUNCTIONALITY
  // ==========================================
  // These are methods that, if we didn't override them within our instance, we
  // would end up with odd behavior as the interior array and the external
  // representation of it would no longer match.
  public pop() {
    const out = this._currentData.pop();
    this._populateInnerStore();
    return out;
  }
  public shift() {
    const out = this._currentData.shift();
    this._populateInnerStore();
    return out;
  }
  public push(...args: Parameters<Array<T>["push"]>) {
    const out = this._currentData.push(...args);
    this._populateInnerStore();
    return out;
  }
  public unshift(...args: Parameters<Array<T>["unshift"]>) {
    const out = this._currentData.unshift(...args);
    this._populateInnerStore();
    return out;
  }

  public at(index: number): T | undefined {
    return this._currentData.at(index);
  }

  public entries() {
    return this._currentData.entries();
  }

  public values() {
    return this._currentData.values();
  }

  public keys() {
    return this._currentData.keys();
  }

  public join(separator?: string): string {
    return this._currentData.join(separator);
  }

  public toString(): string {
    return this._currentData.toString();
  }

  public toLocaleString(): string;
  public toLocaleString(
    locales: string | string[],
    options?: Intl.NumberFormatOptions & Intl.DateTimeFormatOptions,
  ): string;
  public toLocaleString(
    locales?: string | string[],
    options?: Intl.NumberFormatOptions & Intl.DateTimeFormatOptions,
  ): string {
    if (locales) {
      return this._currentData.toLocaleString(locales, options);
    } else {
      return this._currentData.toLocaleString();
    }
  }
}
