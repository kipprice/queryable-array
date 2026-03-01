import type {
  ComparableQueryClause,
  QueryClause,
} from "./queryableClause.types";
import {
  isArray,
  isNumber,
  isObject,
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
import type {
  ElemType,
  NestedPartial,
  UnionToIntersection,
} from "./utils.types";

export const createQueryableClause = <T, X, RT extends T[] = T[]>(
  valueGetter: (t: T) => X,
  currentData: T[],
  originalData: T[] = currentData,
  logic: "and" | "or" = "and",
  currentSet: Set<T> = new Set<T>(),
  onResolve: (t: T[]) => RT = (t) => t as RT,
) => {
  const createResolutionFns = <T, Z>(
    valueGetter: (t: T) => Z,
    arrayLogic: ("some" | "every")[] = [],
    negated = false,
  ) => {
    type ZE = Z extends Array<unknown> ? ElemType<Z> : Z;

    const _resolve = (resolver: (z: ZE) => boolean) => {
      const isAnd = logic === "and";
      const elems = isAnd ? currentData : originalData;

      const filteredElems = elems.filter((t) => {
        if (!isAnd && currentSet.has(t)) {
          return true;
        }

        let z: Z | undefined;
        try {
          z = valueGetter(t as unknown as T);
          /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
        } catch (e) {
          z = undefined;
        }

        const shouldHandleAsArray = isArray(z) && arrayLogic.length > 0;

        let result;
        if (shouldHandleAsArray) {
          result = applyLogicToFlattenedGroups(
            z as Array<ZE>,
            arrayLogic,
            resolver,
          );
        } else {
          result = resolver(z as ZE);
        }

        const resultWithNegation = negated ? !result : result;
        if (resultWithNegation) {
          currentSet.add(t);
        }
        return resultWithNegation;
      });

      return onResolve(filteredElems);
    };

    const out = {
      is: (y: ZE | null | undefined) =>
        isObjectOrArray(y)
          ? _resolve((z: ZE) => isEqual(z, y))
          : _resolve((z: ZE) => y === z),

      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      eq: (y: ZE | null | undefined) => out.is(y as any),
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      equals: (y: ZE | null | undefined) => out.is(y as any),

      isNull: () => _resolve((z: ZE) => z === null),
      isUndefined: () =>
        _resolve((z: ZE) => {
          console.log("Z", z, "UNDEFINED?", z === undefined);
          return z === undefined;
        }),
      isNullish: () => _resolve((z: ZE) => z === undefined || z === null),
      isEmpty: () =>
        _resolve((z: ZE) =>
          z instanceof Array
            ? z.length === 0
            : isObject(z)
              ? Object.keys(z).length === 0
              : false,
        ),

      in: (ys: ZE[]) =>
        _resolve((z: ZE) => !!ys.find((y) => (y === z ? true : isEqual(z, y)))),

      satisfies: (fn: (z: ZE) => boolean) => _resolve(fn),

      greaterThan: (y: ZE) =>
        _resolve((z: ZE) => {
          if (isNumber(z) || isString(z)) {
            return z > y;
          } else {
            return false;
          }
        }),
      gt: (y: ZE) =>
        (out as unknown as ComparableQueryClause<string | number>).greaterThan(
          y as string | number,
        ),

      greaterThanOrEqualTo: (y: Z) =>
        _resolve((z: ZE) => {
          if (isNumber(z) || isString(z)) {
            return z >= y;
          } else {
            return false;
          }
        }),
      gte: (y: ZE) =>
        (
          out as unknown as ComparableQueryClause<string | number>
        ).greaterThanOrEqualTo(y as string | number),

      lessThan: (y: ZE) =>
        _resolve((z: ZE) => {
          if (isNumber(z) || isString(z)) {
            return z < y;
          } else {
            return false;
          }
        }),
      lt: (y: ZE) =>
        (out as unknown as ComparableQueryClause<string | number>).lessThan(
          y as string | number,
        ),

      lessThanOrEqualTo: (y: ZE) =>
        _resolve((z: ZE) => {
          if (isNumber(z) || isString(z)) {
            return z <= y;
          } else {
            return false;
          }
        }),
      lte: (y: ZE) =>
        (
          out as unknown as ComparableQueryClause<string | number>
        ).lessThanOrEqualTo(y as string | number),

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
    } as unknown as QueryClause<Z, RT>;

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
          (t) =>
            arrayLogic.length == 0
              ? valueGetter(t)
              : flattenWithGroups(valueGetter(t) as Array<unknown>),
          [...arrayLogic, "some"],
          negated,
        );
      },

      every: () => {
        return createNestableResolver(
          (t) =>
            arrayLogic.length == 0
              ? valueGetter(t)
              : flattenWithGroups(valueGetter(t) as Array<unknown>),
          [...arrayLogic, "every"],
          negated,
        );
      },
    } as unknown as QueryClause<Z, RT>;

    return out;
  };

  return createNestableResolver(valueGetter) as UnionToIntersection<
    QueryClause<X, RT>
  >;
};
