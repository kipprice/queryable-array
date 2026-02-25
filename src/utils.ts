import { resolve } from "node:dns";
import type { ElemType, Key, NestedPartial } from "./_types";
import {
  isArray,
  isBoolean,
  isDefined,
  isObject,
  isObjectOrArray,
  isSymbol,
} from "./typeChecks";

/**
 * retrieve all keys for a given object, cast into `keyof` types of the same
 * object.
 *
 * @param   object
 *          Object to retrieve keys for
 *
 * @returns The typed set of keys associated with the object
 */
export const getKeys = <T extends object>(object: T) => {
  if (!isDefined(object) || (!isObject(object) && !isArray(object))) {
    return [];
  }
  return Object.keys(object) as (keyof T)[];
};

/**
 * convert an array of elements into a map / dictionary, for faster lookups and
 * indexing.
 *
 * @param   array
 *          The array to transform into a map
 *
 * @param   getKeyFn
 *          The function by which to determine the key for a given element within
 *          the map; must be unique for each element
 *
 * @param   getValFn (optional)
 *          If provided, the transformation the element should undergo before
 *          being assigned as a value in the map. Defaults to the original
 *          element.
 *
 * @returns A map representation of the provided array
 */
export const arrayToMap = <E extends unknown, V = E>(
  array: E[],
  getKeyFn: (e: E) => Key,
  getValFn: (e: E) => V = (e) => e as unknown as V,
) => {
  if (!isArray(array)) {
    return null;
  }

  return array.reduce(
    (acc, cur) => ({ ...acc, [getKeyFn(cur)]: getValFn(cur) }),
    {} as Record<string, V>,
  );
};

/**
 * convert an array into a list of buckets (an object with a shared key and a
 * list of all elements that matched that shared key). An element can be grouped
 * into one or more buckets, as appropriate.
 *
 * @param   array
 *          The array to transform into buckets
 *
 * @param   getBucketsFn
 *          The function by which the shared key(s) for a given element are
 *          determined
 *
 * @returns A list of bucket objects, containing their shared key and a list of
 *          all of the elements that are associated with that shared key
 */
export const bucketMultikeyArray = <E extends unknown>(
  array: E[],
  getBucketsFn: (e: E) => Key[],
) => {
  if (!isArray(array)) {
    return null;
  }
  const tmp: Record<Key, E[]> = {};
  for (const e of array) {
    const bucketKeys = getBucketsFn(e);
    for (const bk of bucketKeys) {
      if (!tmp[bk]) {
        tmp[bk] = [];
      }
      tmp[bk].push(e);
    }
  }

  return Object.entries(tmp).map(([key, value]) => ({ key, value }));
};

/**
 * convert an array of buckets into the equivalent map.
 *
 * @param   buckets
 *          Buckets to convert to map format
 *
 * @returns Map equivalent of the provided buckets
 */
export const bucketsToMap = <E extends unknown>(
  buckets: {
    key: string;
    value: E[];
  }[],
) => {
  if (!isArray(buckets)) {
    return null;
  }
  return buckets.reduce(
    (acc, cur) => ({ ...acc, [cur.key]: cur.value }),
    {} as Record<string, E[]>,
  );
};

/**
 * check if two elements are equal in value to each other. For objects and
 * arrays, this just does a string compare via JSON.stringify -- for more
 * nuanced comparisons, isMatch should be used instead
 *
 * @param   a
 *          First item to compare
 *
 * @param   b
 *          Second item to compare
 *
 * @returns True if the value of each item is equivalent
 */
export const isEqual = <T>(a: T, b: T) => {
  if (isSymbol(a) && isSymbol(b)) {
    return a.toString() === b.toString();
  }
  return JSON.stringify(a) === JSON.stringify(b);
};

/**
 * checks if an object or array matches some subset of detail provided by the
 * caller.
 *
 * @param   base
 *          The object to use as the full comparison object
 *
 * @param   partial
 *          The partial subset that the base object should fully match
 *
 * @returns True if the base object matches te provided subset
 */
export const isMatch = <T extends object, K extends keyof T = keyof T>(
  base: T,
  partial: NestedPartial<T>,
): boolean => {
  const keysToMatch = getKeys(partial);
  return keysToMatch.every((k) => {
    if (isObject(partial[k]) && isObject(base[k])) {
      return isMatch(base[k], partial[k]);
    } else {
      return isEqual(base[k], partial[k]);
    }
  });
};

/**
 * check if two elements are deeply equal to each other, even if the order of
 * their keys differ. When comparing non-objects, this performs a regular
 * 'isEqual' check. However, when comapring objects, this is similar to `isMatch`,
 * but requires that both of the compared objects to have the same properties
 * and values
 *
 * @param   a
 *          First item to compare
 *
 * @param   b
 *          Second item to compare
 *
 * @returns True if the value of each item is equivalent
 */
export const isDeepEqual = <T>(a: T, b: T) => {
  if (!isObjectOrArray(a) || !isObjectOrArray(b)) {
    return isEqual(a, b);
  }

  return isMatch(a, b) && isMatch(b, a);
};

export const START_GROUP_DIVIDER = Symbol("[");
export const END_GROUP_DIVIDER = Symbol("]");

/**
 * turn a set of nested arrays into a flat(ter) version of the same array, with
 * dividers between the elements such that the deep array can be reconstructed
 * as needed
 *
 * @param   arr   The array to flatten
 *
 * @returns An array flattened one layer with dividers marking the start and
 *          ends of the originally nested array
 */
export const flattenWithGroups = <
  A extends Array<unknown>,
  E extends A extends Array<infer E> ? E : never = A extends Array<infer E>
    ? E
    : never,
>(
  arr: (E | typeof START_GROUP_DIVIDER | typeof END_GROUP_DIVIDER)[],
) => {
  return arr
    .map((e) =>
      isArray(e) ? [START_GROUP_DIVIDER, ...e, END_GROUP_DIVIDER] : [e],
    )
    .flat(1) as (
    | ElemType<E>
    | typeof START_GROUP_DIVIDER
    | typeof END_GROUP_DIVIDER
  )[];
};

/**
 * turn a set of nested arrays into a flat(ter) version of the same array, with
 * dividers between the elements such that the deep array can be reconstructed
 * as needed
 *
 * @param   arr   The array to flatten
 *
 * @returns An array flattened one layer with dividers marking the start and
 *          ends of the originally nested array
 */
export const reLayerGroups = <E = any>(
  arr: (E | typeof START_GROUP_DIVIDER | typeof END_GROUP_DIVIDER)[],
) => {
  let layers: Record<number, any[]> = {
    0: [],
  };
  let expectedLayer = 0;

  for (let idx = 0; idx < arr.length; idx += 1) {
    const e = arr[idx];

    // start a new group at the appropriate layer
    if (e === START_GROUP_DIVIDER) {
      expectedLayer += 1;
      if (!layers[expectedLayer]) {
        layers[expectedLayer] = [];
      }
    } else if (e === END_GROUP_DIVIDER) {
      layers[expectedLayer - 1] = [
        ...layers[expectedLayer - 1]!,
        [...layers[expectedLayer]!],
      ];

      layers[expectedLayer] = [];
      expectedLayer -= 1;
    } else {
      layers[expectedLayer]!.push(e as E);
    }
  }

  return layers[0];
};

/**
 * given an array of array logic commands (i.e. "some" or "every"), loops
 * through a flattened set of data to verify whether the chain of these array
 * logic commands are ultimately accepted or rejected
 *
 * @param   arr
 *          The flattened array of values to loop over and apply array logic to
 *
 * @param   arrayLogic
 *          The logic in the array to apply
 *
 * @param   resolver
 *          The function to use to resolve a value in the provided array
 *
 * @returns True if the ultimate chain of array logic resolved to true;
 *          false otherwise
 */
export const applyLogicToFlattenedGroups = <E = any>(
  arr: (E | typeof START_GROUP_DIVIDER | typeof END_GROUP_DIVIDER)[],
  arrayLogic: ("some" | "every")[],
  resolver: (e: E) => boolean,
) => {
  let lastStartIdx = -1;
  let resolved: Array<
    E | boolean | typeof START_GROUP_DIVIDER | typeof END_GROUP_DIVIDER
  > = Array.from(arr);

  // loop through all but the first logic layer to start combining values in the
  // array
  for (let layer = arrayLogic.length - 1; layer > 0; layer -= 1) {
    for (let idx = 0; idx < resolved.length; idx += 1) {
      const e = resolved[idx];

      // keep track of the start of the group we will end up evaluating
      if (e === START_GROUP_DIVIDER) {
        lastStartIdx = idx;

        // once we hit the end of the current group, replace the original
        // values with the resolved values, based on the current logic layer
      } else if (e === END_GROUP_DIVIDER) {
        // only close out a group if we know where the start of the group was
        if (lastStartIdx === -1) {
          continue;
        }

        const group = resolved.slice(lastStartIdx + 1, idx) as E[];
        const groupResolution = group[arrayLogic[layer]!]((e) =>
          isBoolean(e) ? e : resolver(e),
        );
        resolved.splice(lastStartIdx, idx - lastStartIdx + 1, groupResolution);
        idx = lastStartIdx;
        lastStartIdx = -1;
      }
    }
  }

  // the final resolution happens at the top level of the resolved array and returns just a single boolean
  return resolved[arrayLogic[0]!]((e) => {
    if (e === START_GROUP_DIVIDER || e === END_GROUP_DIVIDER) {
      throw new Error("too few array logics passed");
    }
    return isBoolean(e) ? e : resolver(e as E);
  });
};
