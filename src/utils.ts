import type { ElemType, Key, NestedPartial } from "./utils.types";
import { assert } from "./assertions";
import {
  isArray,
  isBoolean,
  isDefined,
  isObjectOrArray,
  isPrimitive,
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
  return (isObjectOrArray(object) ? Object.keys(object) : []) as (keyof T)[];
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
export const arrayToMap = <E, V = E>(
  array: E[],
  getKeyFn: (e: E) => Key,
  getValFn: (e: E) => V = (e) => e as unknown as V,
) => {
  if (!isArray(array)) {
    return null;
  }

  const out: Record<Key, V> = {};
  array.forEach((e) => (out[getKeyFn(e)] = getValFn(e)));
  return out;
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
export const bucketMultikeyArray = <E>(
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
export const bucketsToMap = <E>(
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
  if (a === b) {
    return true;
  }
  if (isPrimitive(a) || isPrimitive(b)) {
    return false;
  }
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
export const isMatch = <T extends object>(
  base: T,
  partial: NestedPartial<T>,
): boolean => {
  const keysToMatch = getKeys(partial);
  return keysToMatch.every((k) => {
    if (isObjectOrArray(partial[k]) && isObjectOrArray(base[k])) {
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
export const isDeepEqual = <T>(a: T, b: T): boolean => {
  if (!isObjectOrArray(a) || !isObjectOrArray(b)) {
    return isEqual(a, b);
  }

  const keysToMatch = [...getKeys(a), ...getKeys(b)];
  return keysToMatch.every((k: keyof T) => {
    if (isObjectOrArray(a[k]) && isObjectOrArray(b[k])) {
      return isDeepEqual(a[k], b[k]);
    } else {
      return isEqual(a[k], b[k]);
    }
  });
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
  if (!isDefined(arr)) {
    return arr;
  }

  const out = [];

  for (const e of arr) {
    if (!isArray(e)) {
      out.push(e);
      continue;
    }

    out.push(START_GROUP_DIVIDER);
    e.forEach((x) => out.push(x));
    out.push(END_GROUP_DIVIDER);
  }

  return out as (
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
export const reLayerGroups = <E>(
  arr: (E | typeof START_GROUP_DIVIDER | typeof END_GROUP_DIVIDER)[],
) => {
  const layers: unknown[][] = [[]];
  let currentLayer = 0;

  for (let idx = 0; idx < arr.length; idx += 1) {
    const e = arr[idx];

    // start a new group at the appropriate layer
    if (e === START_GROUP_DIVIDER) {
      currentLayer += 1;
      if (!layers[currentLayer]) {
        layers[currentLayer] = [];
      }
    } else if (e === END_GROUP_DIVIDER) {
      layers[currentLayer - 1]!.push(layers[currentLayer]!);

      layers[currentLayer] = [];
      currentLayer -= 1;
    } else {
      layers[currentLayer]!.push(e as E);
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
export const applyLogicToFlattenedGroups = <E>(
  arr: (E | typeof START_GROUP_DIVIDER | typeof END_GROUP_DIVIDER)[],
  arrayLogic: ("some" | "every")[],
  resolver: (e: E) => boolean,
) => {
  const layers: (E | boolean)[][] = [[]];
  let currentLayer = 0;
  let skipNextXEndGroups = -1;

  // if this array isn't flattened, just evaluate it as normal
  if (arr[0] !== START_GROUP_DIVIDER) {
    return arr.length > 0 && arr[arrayLogic[0]!]((e) => resolver(e as E));
  }

  // loop through each item in order to be able to sequentially create and
  // squash groups
  for (let idx = 0; idx < arr.length; idx += 1) {
    const e = arr[idx];

    // keep track of the start of the group we will end up evaluating
    if (e === START_GROUP_DIVIDER) {
      if (skipNextXEndGroups >= 0) {
        skipNextXEndGroups += 1;
        continue;
      }
      currentLayer += 1;
      layers[currentLayer] = [];

      // once we hit the end of the current group, replace the original
      // values with the resolved values, based on the current logic layer
    } else if (e === END_GROUP_DIVIDER) {
      if (skipNextXEndGroups > 0) {
        skipNextXEndGroups -= 1;
        continue;
      }
      skipNextXEndGroups = -1;

      const logic = arrayLogic[currentLayer];
      if (!logic) {
        throw new Error("too few array logics passed");
      }
      const group = layers.pop()!;
      const groupResolution =
        group.length > 0 &&
        (logic === "some"
          ? group.some((e) => (isBoolean(e) ? e : resolver(e)))
          : group.every((e) => (isBoolean(e) ? e : resolver(e))));

      currentLayer -= 1;
      layers[currentLayer]!.push(groupResolution);

      // if we know the remaining checks at this layer are superfluous given the
      // current logic, exit early
      for (let lIdx = currentLayer; lIdx >= 0; lIdx -= 1) {
        const nextLogic = arrayLogic[lIdx];
        const canFailFast =
          // any true value will succeed in a 'some' evaluation
          (nextLogic === "some" && groupResolution) ||
          // any false value will fail in an 'every' evaluation
          (nextLogic === "every" && !groupResolution);

        if (canFailFast) {
          if (lIdx === 0) {
            return groupResolution;
          } else {
            skipNextXEndGroups += 1;
          }
        } else {
          break;
        }
      }
    } else {
      if (skipNextXEndGroups >= 0) {
        continue;
      }
      layers[currentLayer]!.push(e!);
    }
  }

  // if we have not popped off all of our layers, something has gone wrong
  assert(layers.length == 1);

  // the final resolution happens at the top level of the resolved array and returns just a single boolean
  const finalLogic = arrayLogic[0];
  const finalGroup = layers[0];

  return (
    finalGroup &&
    finalGroup.length > 0 &&
    (finalLogic === "some"
      ? finalGroup.some((e) => {
          // if we've made it this far, we must have already applied some logic to
          // the previous levels and thus can just return their results
          return e;
        })
      : finalGroup.every((e) => {
          // if we've made it this far, we must have already applied some logic to
          // the previous levels and thus can just return their results
          return e;
        }))
  );
};
