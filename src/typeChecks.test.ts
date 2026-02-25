import { describe, it, expect } from "vitest";
import {
  isArray,
  isBoolean,
  isDefined,
  isFunction,
  isKey,
  isNumber,
  isObject,
  isObjectOrArray,
  isString,
  isSymbol,
} from "./typeChecks";

const testValues: [string, any][] = [
  ["string", "string"],
  ["number", 0],
  ["boolean", false],
  ["symbol", Symbol("*")],
  ["array", ["a", "b", "c"]],
  ["object", { a: 1, b: 2, c: 3 }],
  ["function", () => {}],
  ["null", null],
  ["undefined", undefined],
];

describe("typechecks", () => {
  describe("isString", () => {
    it.each(
      testValues.map(([key, value]) =>
        key === "string" ? [key, true, value] : [key, false, value],
      ),
    )(
      "isString(%s) returns %s",
      (name: string, expectedResult: boolean, value: unknown) => {
        expect(isString(value)).to.eq(expectedResult);
      },
    );
  });

  describe("isNumber", () => {
    it.each(
      testValues.map(([key, value]) =>
        key === "number" ? [key, true, value] : [key, false, value],
      ),
    )(
      "isNumber(%s) returns %s",
      (name: string, expectedResult: boolean, value: unknown) => {
        expect(isNumber(value)).to.eq(expectedResult);
      },
    );
  });

  describe("isBoolean", () => {
    it.each(
      testValues.map(([key, value]) =>
        key === "boolean" ? [key, true, value] : [key, false, value],
      ),
    )(
      "isBoolean(%s) returns %s",
      (name: string, expectedResult: boolean, value: unknown) => {
        expect(isBoolean(value)).to.eq(expectedResult);
      },
    );
  });

  describe("isSymbol", () => {
    it.each(
      testValues.map(([key, value]) =>
        key === "symbol" ? [key, true, value] : [key, false, value],
      ),
    )(
      "isSymbol(%s) returns %s",
      (name: string, expectedResult: boolean, value: unknown) => {
        expect(isSymbol(value)).to.eq(expectedResult);
      },
    );
  });

  describe("isArray", () => {
    it.each(
      testValues.map(([key, value]) =>
        key === "array" ? [key, true, value] : [key, false, value],
      ),
    )(
      "isArray(%s) returns %s",
      (name: string, expectedResult: boolean, value: unknown) => {
        expect(isArray(value)).to.eq(expectedResult);
      },
    );
  });

  describe("isObject", () => {
    it.each(
      testValues.map(([key, value]) =>
        key === "object" ? [key, true, value] : [key, false, value],
      ),
    )(
      "isObject(%s) returns %s",
      (name: string, expectedResult: boolean, value: unknown) => {
        expect(isObject(value)).to.eq(expectedResult);
      },
    );
  });

  describe("isFunction", () => {
    it.each(
      testValues.map(([key, value]) =>
        key === "function" ? [key, true, value] : [key, false, value],
      ),
    )(
      "isFUnction(%s) returns %s",
      (name: string, expectedResult: boolean, value: unknown) => {
        expect(isFunction(value)).to.eq(expectedResult);
      },
    );
  });

  describe("isObjectOrArray", () => {
    it.each(
      testValues.map(([key, value]) =>
        ["object", "array"].includes(key)
          ? [key, true, value]
          : [key, false, value],
      ),
    )(
      "isObjectOrArray(%s) returns %s",
      (name: string, expectedResult: boolean, value: unknown) => {
        expect(isObjectOrArray(value)).to.eq(expectedResult);
      },
    );
  });

  describe("isDefined", () => {
    it.each(
      testValues.map(([key, value]) =>
        ["null", "undefined"].includes(key)
          ? [key, false, value]
          : [key, true, value],
      ),
    )(
      "isDefined(%s) returns %s",
      (name: string, expectedResult: boolean, value: unknown) => {
        expect(isDefined(value)).to.eq(expectedResult);
      },
    );
  });

  describe("isKey", () => {
    it.each(
      testValues.map(([key, value]) =>
        ["string", "number", "symbol"].includes(key)
          ? [key, true, value]
          : [key, false, value],
      ),
    )(
      "isKey(%s) returns %s",
      (name: string, expectedResult: boolean, value: unknown) => {
        expect(isKey(value)).to.eq(expectedResult);
      },
    );
  });
});
