import type { Key } from "./_types";

/**
 * verify if the provided test value is a string
 */
export function isString(test: unknown): test is string {
  return typeof test === "string";
}

/**
 * verify if the provided test value is a number
 */
export function isNumber(test: unknown): test is number {
  return typeof test === "number";
}

/**
 * verify if the provided test value is a boolean
 */
export function isBoolean(test: unknown): test is boolean {
  return typeof test === "boolean";
}

/**
 * verify if the provided test value is a symbol
 */
export function isSymbol(test: unknown): test is symbol {
  return typeof test === "symbol";
}

/**
 * verify if the provided test value is an array of some element type
 */
export function isArray<T = unknown>(test: unknown): test is Array<T> {
  return test instanceof Array;
}

/**
 * verify if the provided test value is an object
 */
export function isObject<T = unknown>(test: unknown): test is object {
  return typeof test === "object" && !isArray(test) && test !== null;
}

/**
 * verify if the provided test value is a function
 */
export function isFunction(test: unknown): test is Function {
  return typeof test === "function";
}

/**
 * verify if the provided test value is either an object or an array
 */
export function isObjectOrArray<T = unknown>(
  test: unknown,
): test is object | Array<T> {
  return isArray(test) || isObject(test);
}

/**
 * verify if the provided test value is a non-empty value
 */
export function isDefined<T>(test: T): test is NonNullable<T> {
  if (test === undefined) {
    return false;
  }
  if (test === null) {
    return false;
  }
  return true;
}

/**
 * verify if the provided test value is a key suitable to use in a map
 */
export function isKey(test: unknown): test is Key {
  return isString(test) || isNumber(test) || isSymbol(test);
}
