import { describe, it, expect } from "vitest";
import { assert, assertIsDefined } from "./assertions";

describe("assert", () => {
  it("continues if the assertion is true", () => {
    expect(() => assert(true)).to.not.throw();
  });

  it("throws an error if the assertion is false", () => {
    expect(() => assert(false)).to.throw(Error, "expected value to be true");
  });

  it("can use a specific message when throwing", () => {
    expect(() => assert(false, "!!!")).to.throw(Error, "!!!");
  });
});

describe("assertIsDefined", () => {
  it("continues if the value under test is defined", () => {
    expect(() => assertIsDefined("abc")).to.not.throw();
    expect(() => assertIsDefined(55)).to.not.throw();
    expect(() => assertIsDefined([1, 2])).to.not.throw();
  });

  it("continues if the value under test is falsey, but defined", () => {
    expect(() => assertIsDefined("")).to.not.throw();
    expect(() => assertIsDefined(0)).to.not.throw();
    expect(() => assertIsDefined([])).to.not.throw();
    expect(() => assertIsDefined(false)).to.not.throw();
  });

  it("throws an error if the value under test is null", () => {
    expect(() => assertIsDefined(null)).to.throw(
      Error,
      "expected value to be defined",
    );
  });

  it("throws an error if the value under test is undefined", () => {
    expect(() => assertIsDefined(undefined)).to.throw(
      Error,
      "expected value to be defined",
    );
  });

  it("can use a specific message when throwing", () => {
    expect(() => assertIsDefined(undefined, "!!!")).to.throw(Error, "!!!");
  });
});
