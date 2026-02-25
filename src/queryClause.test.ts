import { describe, it, expect, vi } from "vitest";
import { queryClause, queryClauses } from "./queryClause";
import { isNumber, isString } from "./typeChecks";
import type { ComparableQueryClause } from "./queryClause.types";
import type { UnionToIntersection } from "./_types";

describe("query clause", () => {
  it("can create a query clause", () => {
    expect(queryClause("abc")).to.be.an("object");
  });

  it("can detect that a query clause is unresolved", () => {
    const qc = queryClause("abc");
    expect(qc.isResolved).to.be.false;
  });

  it("can detect that a query clause is not negated", () => {
    const qc = queryClause("abc");
    expect(qc.isNegated).to.be.false;
  });

  it("can detect that a query clause is negated", () => {
    const qc = queryClause("abc").not();
    expect(qc.isNegated).to.be.true;
  });

  describe("is", () => {
    it("returns true when the provided value matches the value in the clause", () => {
      expect(queryClause("abc").is("abc").result).to.be.true;
    });

    it("returns false when the provided value does not match the value in the clause", () => {
      expect(queryClause("abc").is("def").result).to.be.false;
    });

    it("returns false when negating 'is' and the value is actually a match", () => {
      expect(queryClause("abc").not().is("abc").result).to.be.false;
    });

    it("returns true when negating 'is' and the value is not a match", () => {
      expect(queryClause("abc").not().is("def").result).to.be.true;
    });

    it("can detect that a query clause is resolved after evaluating 'is'", () => {
      expect(queryClause("abc").is("abc").isResolved).to.be.true;
    });

    it("can use 'equals' to call the 'is' function", () => {
      expect(queryClause("abc").equals("abc").result).to.be.true;
    });

    it("can use 'eq' to call the 'is' function", () => {
      expect(queryClause("abc").eq("abc").result).to.be.true;
    });
  });

  describe("isNull", () => {
    it("returns true when the value in the clause is null", () => {
      expect(queryClause(null).isNull().result).to.be.true;
    });

    it("returns false when the value in the clause is not null", () => {
      expect(queryClause("abc").isNull().result).to.be.false;
    });

    it("returns false when negating 'isNull' and the value is actually a match", () => {
      expect(queryClause(null).not().isNull().result).to.be.false;
    });

    it("returns true when negating 'isNull' and the value is not a match", () => {
      expect(queryClause("abc").not().isNull().result).to.be.true;
    });
  });

  describe("isUndefined", () => {
    it("returns true when the value in the clause is undefined", () => {
      expect(queryClause(undefined).isUndefined().result).to.be.true;
    });

    it("returns false when the value in the clause is not undefined", () => {
      expect(queryClause("abc").isUndefined().result).to.be.false;
    });

    it("returns false when negating 'isUndefined' and the value is actually a match", () => {
      expect(queryClause(undefined).not().isUndefined().result).to.be.false;
    });

    it("returns true when negating 'isUndefined' and the value is not a match", () => {
      expect(queryClause("abc").not().isUndefined().result).to.be.true;
    });
  });

  describe("isNullish", () => {
    it("returns true when the value in the clause is null", () => {
      expect(queryClause(null).isNullish().result).to.be.true;
    });

    it("returns true when the value in the clause is undefined", () => {
      expect(queryClause(undefined).isNullish().result).to.be.true;
    });

    it("returns false when the value in the clause is not null or undefined", () => {
      expect(queryClause("abc").isNullish().result).to.be.false;
    });

    it("returns false when negating 'isNullish' and the value is actually a match", () => {
      expect(queryClause(null).not().isNullish().result).to.be.false;
    });

    it("returns false when negating 'isNullish' and the value is actually a match", () => {
      expect(queryClause(undefined).not().isNullish().result).to.be.false;
    });

    it("returns true when negating 'isNullish' and the value is not a match", () => {
      expect(queryClause("abc").not().isNullish().result).to.be.true;
    });
  });

  describe("in", () => {
    it("returns true when the provided values contains the value in the clause", () => {
      expect(queryClause("abc").in(["abc", "def"]).result).to.be.true;
    });

    it("returns false when the provided values do not contain the value in the clause", () => {
      expect(queryClause("abc").in(["def"]).result).to.be.false;
    });

    it("returns false when negating 'in' and the value is actually a match", () => {
      expect(queryClause("abc").not().in(["abc"]).result).to.be.false;
    });

    it("returns true when negating 'in' and the value is not a match", () => {
      expect(queryClause("abc").not().in(["def"]).result).to.be.true;
    });
  });

  describe("asserts", () => {
    it("can accept a value that passes an arbitrary validation check", () => {
      const obj = {
        a: 1,
        b: { c: "abc", d: "def" },
      };
      const qc = queryClause(obj);
      expect(
        qc.satisfies((e) => queryClause(Object.keys(e)).is(["a", "b"]).result)
          .result,
      ).to.be.true;
    });

    it("can reject a value that does not pass an arbitrary validation check", () => {
      const obj = {
        a: 1,
        b: { c: "abc", d: "def" },
      };
      const qc = queryClause(obj);
      expect(
        qc.satisfies(
          (e) => queryClause(Object.keys(e)).is(["a", "b", "c"]).result,
        ).result,
      ).to.be.false;
    });

    it("returns false when negating 'asserts' and the value is actually a match", () => {
      expect(
        queryClause("abc")
          .not()
          .satisfies((v) => isString(v)).result,
      ).to.be.false;
    });

    it("returns true when negating 'asserts' and the value is not a match", () => {
      expect(
        queryClause("abc")
          .not()
          .satisfies((v) => v.length === 2).result,
      ).to.be.true;
    });
  });

  describe("greater than", () => {
    it("returns true when the provided numeric value is less than the value in the clause", () => {
      expect(queryClause(50).greaterThan(49).result).to.be.true;
    });

    it("returns true when the provided string value is less than the value in the clause", () => {
      expect(queryClause("def").greaterThan("abc").result).to.be.true;
    });

    it("returns false when the provided value is greater than the value in the clause", () => {
      expect(queryClause(50).greaterThan(50).result).to.be.false;
    });

    it("returns false when negating 'gt' and the value is actually a match", () => {
      expect(queryClause(50).not().gt(49).result).to.be.false;
    });

    it("returns true when negating 'gt' and the value is not a match", () => {
      expect(queryClause(50).not().gt(50).result).to.be.true;
    });
  });

  describe("greater than or equal to", () => {
    it("returns true when the provided numeric value is less than the value in the clause", () => {
      expect(queryClause(50).greaterThanOrEqualTo(49).result).to.be.true;
    });

    it("returns true when the provided numeric value is equal to the value in the clause", () => {
      expect(queryClause(50).greaterThanOrEqualTo(50).result).to.be.true;
    });

    it("returns true when the provided string value is less than the value in the clause", () => {
      expect(queryClause("def").greaterThanOrEqualTo("abc").result).to.be.true;
    });

    it("returns true when the provided string value is equal to the value in the clause", () => {
      expect(queryClause("abc").greaterThanOrEqualTo("abc").result).to.be.true;
    });

    it("returns false when the provided value is greater than the clause", () => {
      expect(queryClause(50).greaterThanOrEqualTo(51).result).to.be.false;
    });

    it("returns false when negating 'gte' and the value is actually a match", () => {
      expect(queryClause(50).not().gte(50).result).to.be.false;
    });

    it("returns true when negating 'gte' and the value is not a match", () => {
      expect(queryClause(50).not().gte(51).result).to.be.true;
    });
  });

  describe("less than", () => {
    it("returns true when the provided numeric value is greater than the value in the clause", () => {
      expect(queryClause(50).lessThan(51).result).to.be.true;
    });

    it("returns true when the provided string value is greater than the value in the clause", () => {
      expect(queryClause("abc").lessThan("def").result).to.be.true;
    });

    it("returns false when the provided value is less than the value in the clause", () => {
      expect(queryClause(50).lessThan(50).result).to.be.false;
    });

    it("returns false when negating 'lt' and the value is actually a match", () => {
      expect(queryClause("abc").not().lt("def").result).to.be.false;
    });

    it("returns true when negating 'lt' and the value is not a match", () => {
      expect(queryClause(50).not().lt(50).result).to.be.true;
    });
  });

  describe("less than or equal to", () => {
    it("returns true when the provided numeric value is greater than the value in the clause", () => {
      expect(queryClause(50).lessThanOrEqualTo(51).result).to.be.true;
    });

    it("returns true when the provided numeric value is equal to the value in the clause", () => {
      expect(queryClause(50).lessThanOrEqualTo(50).result).to.be.true;
    });

    it("returns true when the provided string value is greater than the value in the clause", () => {
      expect(queryClause("abc").lessThanOrEqualTo("def").result).to.be.true;
    });

    it("returns true when the provided string value is equal to the value in the clause", () => {
      expect(queryClause("abc").lessThanOrEqualTo("abc").result).to.be.true;
    });

    it("returns false when the provided value is less than the clause", () => {
      expect(queryClause(50).lessThanOrEqualTo(49).result).to.be.false;
    });

    it("returns false when negating 'lte' and the value is actually a match", () => {
      expect(queryClause(50).not().lte(50).result).to.be.false;
    });

    it("returns true when negating 'lte' and the value is not a match", () => {
      expect(queryClause(50).not().lte(49).result).to.be.true;
    });
  });

  describe("its", () => {
    it("can chain to a nested property on the value", () => {
      const obj = {
        name: "abc",
      };
      const qc = queryClause(obj);
      expect(qc.its("name")).to.be.an("object");
    });

    it("can get a result after chaining one step", () => {
      const obj = {
        name: "abc",
      };
      const qc = queryClause(obj);
      expect(qc.its("name").is("abc").result).to.be.true;
    });

    it("can get a result after chaining multiple steps", () => {
      const obj = {
        a: { b: { c: "abc" } },
      };
      const qc = queryClause(obj);
      expect(qc.its("a").its("b").its("c").is("abc").result).to.be.true;
    });
  });

  describe("matches", () => {
    it("can confirm a match with a partial object", () => {
      const obj = {
        a: 1,
        b: { c: "abc", d: "def" },
      };
      const qc = queryClause(obj);
      expect(qc.matches({ b: { c: "abc" } }).result).to.be.true;
    });

    it("can reject a non-match a partial object", () => {
      const obj = {
        a: 1,
        b: { c: "abc", d: "def" },
      };
      const qc = queryClause(obj);
      expect(qc.matches({ b: { c: "def" } }).result).to.be.false;
    });

    it("returns false when negating 'matches' and the value is actually a match", () => {
      const obj = {
        a: 1,
        b: { c: "abc", d: "def" },
      };
      expect(
        queryClause(obj)
          .not()
          .matches({ b: { c: "abc" } }).result,
      ).to.be.false;
    });

    it("returns true when negating 'matches' and the value is not a match", () => {
      const obj = {
        a: 1,
        b: { c: "abc", d: "def" },
      };
      expect(
        queryClause(obj)
          .not()
          .matches({ b: { c: "def" } }).result,
      ).to.be.true;
    });
  });

  describe("every", () => {
    it('adds a "every" function to a query clause based around an array', () => {
      const qc = queryClause([]);
      expect(qc.every).to.be.a("function");
    });

    it("can confirm that all items in an array equal a specific value", () => {
      const qc = queryClause(["a", "a"]);
      expect(qc.every().is("a").result).to.be.true;
    });

    it("can confirm that all items in an array do not equal a specific value", () => {
      const qc = queryClause(["a", "b"]);
      expect(qc.every().is("a").result).to.be.false;
    });

    it("can negate an operation that would normally return true", () => {
      const qc = queryClause(["a", "a"]);
      expect(qc.every().not().is("a").result).to.be.false;
    });

    it("can negate an operation that would normally return false", () => {
      const qc = queryClause(["a", "b"]);
      expect(qc.every().not().is("a").result).to.be.true;
    });

    it("can match on an array of objects", () => {
      const qc = queryClause([
        { a: "1", b: 2 },
        { a: "1", b: 3 },
      ]);
      expect(qc.every().matches({ a: "1" }).result).to.be.true;
    });

    it("can reject an array of objects that has some mismatches", () => {
      const qc = queryClause([
        { a: "1", b: 2 },
        { a: "1", b: 3 },
      ]);
      expect(qc.every().matches({ b: 2 }).result).to.be.false;
    });

    it("can match on an array of arrays", () => {
      const qc = queryClause([
        ["a", "b"],
        ["a", "b"],
      ]);
      expect(qc.every().is(["a", "b"]).result).to.be.true;
    });
  });

  describe("some", () => {
    it("can nest 'some' functions across multiple layers of arrays", () => {
      const x = [{ details: [1, 2] }, { details: [2, 3] }];
      const qs = queryClause(x);
      expect(qs.some().its("details").some().is(2).result).to.be.true;
    });

    it("can perform a some filter across multiple value types", () => {
      const data = [7, "abc", true];
      expect(queryClause(data).some().is("abc").result).to.be.true;
    });

    it("can filter deeply nested arrays", () => {
      const data = [
        {
          id: "a",
          roles: [
            [1, "Artist"],
            [2, "Backpacker"],
          ],
        },
        {
          id: "b",
          roles: [
            [1, "Artist"],
            [4, "Musician"],
          ],
        },
        { id: "c", roles: [[1, "Artist"]] },
      ];

      const qc = queryClauses(data, "some").its("roles").some().some();
      expect(
        queryClauses(data, "some").its("roles").some().some().is("Artist")
          .result,
      ).to.be.true;
    });

    it("can alternate between 'some' and 'every' functions across multiple layers of object arrays", () => {
      const x = [{ details: [1, 2] }, { details: [2, 3] }];
      const qs = queryClause(x);
      expect(qs.every().its("details").some().is(2).result).to.be.true;
      expect(qs.some().its("details").every().is(2).result).to.be.false;
      expect(
        qs
          .some()
          .its("details")
          .every()
          .satisfies((x) => isNumber(x)).result,
      ).to.be.true;
    });

    it("can alternate between 'some' and 'every' functions across multiple nested arrays", () => {
      const x = [
        [
          ["r1", "Artist"],
          ["r2", "Backpacker"],
        ],

        [
          ["r1", "Artist"],
          ["r4", "Musician"],
        ],

        [["r1", "Artist"]],
      ];

      expect(
        queryClause(x)
          .every("collection")
          .some("role")
          .some("role identifier")
          .is("r1").result,
      ).to.be.true;

      expect(
        queryClause(x)
          .some("collection")
          .every("role")
          .every("role identfier")
          .is("r1").result,
      ).to.be.false;

      expect(
        queryClause(x)
          .some("collection")
          .every("role")
          .some("role identfier")
          .is("r1").result,
      ).to.be.true;
    });
  });

  describe("includes", () => {
    it("can detect that the current value array contains the provided value", () => {
      const data = ["a", "b", "c"];
      expect(queryClause(data).includes("b").result).to.be.true;
    });

    it("can detect that the current value array does not contain the provided value", () => {
      const data = ["a", "b", "c"];
      expect(queryClause(data).includes("d").result).to.be.false;
    });

    it("returns false when negating 'includes' and the value is actually a match", () => {
      const data = ["a", "b", "c"];
      expect(queryClause(data).not().includes("c").result).to.be.false;
    });

    it("returns true when negating 'includes' and the value is not a match", () => {
      const data = ["a", "b", "c"];
      expect(queryClause(data).not().includes("d").result).to.be.true;
    });
  });
});

describe("query clauses", () => {
  it("can generate a query clauses object", () => {
    expect(queryClauses([{ a: "1" }, { b: "2" }], "every")).to.be.an("object");
  });

  it("can generate a query clauses object even if the provided array is empty", () => {
    expect(queryClauses([], "some")).to.be.an("object");
  });

  it("can chain properties across a set of optional types", () => {
    type Data = {
      a?: number;
      b?: { c?: number };
    };
    const data: Data[] = [{ a: 1 }, { b: { c: 2 } }];
    const qc = queryClauses(data, "some");

    expect(qc.its("a").is(1).result).to.be.true;
    expect(qc.its("b").its("c").is(2).result).to.be.true;
  });

  it("can determine that all members of a clause array matches", () => {
    expect(
      queryClauses(
        [
          { a: "1", b: 3 },
          { a: "1", b: 2 },
        ],
        "every",
      ).matches({ a: "1" }).result,
    ).to.be.true;
  });

  it("can determine that not all members of a clause array match", () => {
    expect(
      queryClauses(
        [
          { a: "1", b: 3 },
          { a: "1", b: 2 },
        ],
        "every",
      ).matches({ a: "1" }).result,
    ).to.be.true;
  });

  it("can determine that an empty clause array cannot match via every", () => {
    expect(
      queryClauses<{ a?: string; b?: string }>([], "every").matches({ a: "1" })
        .result,
    ).to.be.false;
  });

  it("can determine that an empty clause array cannot match via some", () => {
    expect(
      queryClauses<{ a?: string; b?: string }>([], "some").matches({ a: "1" })
        .result,
    ).to.be.false;
  });
});
