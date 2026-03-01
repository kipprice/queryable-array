/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, expect, it } from "vitest";
import { createQueryableClause } from "./queryableClause";
import {
  BaseQueryClause,
  ComparableQueryClause,
} from "./queryableClause.types";
import { isString } from "./typeChecks";
import { ElemType } from "./utils.types";

describe("queryable clause (via where)", () => {
  describe("resolvers", () => {
    describe("is", () => {
      const aliases = [
        ["is"],
        ["eq"],
        ["equals"],
      ] as (keyof BaseQueryClause<any>)[][];
      it.each(aliases)("can verify primitive equality via %s", (alias) => {
        const data = [
          { str: "a", num: 1, bool: true },
          { str: "b", num: 2, bool: false },
        ];
        expect(
          (
            createQueryableClause((t) => t.str, data)[alias] as CallableFunction
          )("b"),
        ).to.eql([data[1]]);
        expect(
          (
            createQueryableClause((t) => t.num, data)[alias] as CallableFunction
          )(1),
        ).to.eql([data[0]]);
        expect(
          (
            createQueryableClause((t) => t.bool, data)[
              alias
            ] as CallableFunction
          )(true),
        ).to.eql([data[0]]);
      });

      it.each(aliases)("can verify object equality via %s", (alias) => {
        const data = [
          { str: "a", num: 1, bool: true },
          { str: "b", num: 2, bool: false },
        ];
        const qc = createQueryableClause((t) => t, data);
        expect(
          (qc[alias] as CallableFunction)({ str: "a", num: 1, bool: true }),
        ).to.eql([data[0]]);
      });

      it.each(aliases)("can verify array equality via %s", (alias) => {
        const data = [{ arr: [1, 2] }, { arr: [2, 3] }];
        const qc = createQueryableClause((t) => t.arr, data);
        expect((qc[alias] as CallableFunction)([2, 3])).to.eql([data[1]]);
      });
    });

    describe("isNull", () => {
      it("can check if an element is null", () => {
        const data = [{}, [], 0, undefined, null];
        const qc = createQueryableClause((t) => t, data);
        expect(qc.isNull()).to.eql([null]);
      });
    });

    describe("isUndefined", () => {
      it("can check if an element is undefined", () => {
        const data = [{}, [], 0, undefined, null];
        const qc = createQueryableClause((t) => t, data);
        expect(qc.isUndefined()).to.eql([undefined]);
      });
    });

    describe("isNullish", () => {
      it("can check if an element is null or undefined", () => {
        const data = [{}, [], 0, undefined, null];
        const qc = createQueryableClause((t) => t, data);
        expect(qc.isNullish()).to.eql([undefined, null]);
      });
    });

    describe("isEmpty", () => {
      it("can check if an object is empty", () => {
        const data = [{}, { id: "2" }];
        const qc = createQueryableClause((t) => t, data);
        expect(qc.isEmpty()).to.eql([{}]);
      });

      it("can check if an array is empty", () => {
        const data = [{ tags: [{ id: "t1" }] }, { tags: [] }];
        const qc = createQueryableClause((t) => t.tags, data);
        expect(qc.isEmpty()).to.eql([{ tags: [] }]);
      });

      it("ignores empty queries for all other types", () => {
        const data = [{ tags: [{ id: "t1" }] }, { tags: [] }];
        const qc = createQueryableClause((t) => t.tags, data);
        expect((qc.some().its("id") as any).isEmpty()).to.eql([]);
      });
    });

    describe("in", () => {
      it("can confirm that an element is contained in the specified array", () => {
        const data = ["a", "b", "c"];
        const qc = createQueryableClause((t) => t, data);
        expect(qc.in(["b", "d", "a"])).to.eql(["a", "b"]);
      });
    });

    describe("satisfies", () => {
      it("can confirm that an element satisfies a certain function", () => {
        const data = ["abc", "def", "hijk"];
        const qc = createQueryableClause((t) => t, data);
        expect(qc.satisfies((x) => x.length === 3)).to.eql(["abc", "def"]);
      });
    });

    describe("greaterThan", () => {
      const aliases = [["greaterThan"], ["gt"]] as (keyof ComparableQueryClause<
        any,
        any
      >)[][];
      it.each(aliases)(
        "can confirm that an element is greater than the specified value via %s",
        (alias) => {
          const data = [5, 10, 15, 20, 25];
          const qc = createQueryableClause((t) => t, data);
          expect((qc[alias] as CallableFunction)(15)).to.eql([20, 25]);
        },
      );
    });

    describe("greaterThanOrEqualTo", () => {
      const aliases = [
        ["greaterThanOrEqualTo"],
        ["gte"],
      ] as (keyof ComparableQueryClause<any, any>)[][];
      it.each(aliases)(
        "can confirm that an element is greater than the specified value via %s",
        (alias) => {
          const data = [5, 10, 15, 20, 25];
          const qc = createQueryableClause((t) => t, data);
          expect((qc[alias] as CallableFunction)(15)).to.eql([15, 20, 25]);
        },
      );
    });

    describe("lessThan", () => {
      const aliases = [["lessThan"], ["lt"]] as (keyof ComparableQueryClause<
        any,
        any
      >)[][];
      it.each(aliases)(
        "can confirm that an element is greater than the specified value via %s",
        (alias) => {
          const data = [5, 10, 15, 20, 25];
          const qc = createQueryableClause((t) => t, data);
          expect((qc[alias] as CallableFunction)(15)).to.eql([5, 10]);
        },
      );
    });

    describe("lessThanOrEqualTo", () => {
      const aliases = [
        ["lessThanOrEqualTo"],
        ["lte"],
      ] as (keyof ComparableQueryClause<any, any>)[][];
      it.each(aliases)(
        "can confirm that an element is greater than the specified value via %s",
        (alias) => {
          const data = [5, 10, 15, 20, 25];
          const qc = createQueryableClause((t) => t, data);
          expect((qc[alias] as CallableFunction)(15)).to.eql([5, 10, 15]);
        },
      );
    });

    describe("matches", () => {
      it("can confirm that an element matches a provided partial object", () => {
        const data = [
          { id: 1, name: "A" },
          { id: 2, name: "B" },
          { id: 3, name: "C" },
        ];
        const qc = createQueryableClause((t) => t, data);
        expect(qc.matches({ name: "B" })).to.eql([data[1]]);
      });
    });

    describe("deepEquals", () => {
      it("can confirm that an element matches a provided object", () => {
        const data = [
          { id: 1, name: "A" },
          { id: 2, name: "B" },
          { id: 3, name: "C" },
        ];
        const qc = createQueryableClause((t) => t, data);
        expect(qc.deepEquals({ id: 2, name: "B" })).to.eql([data[1]]);
      });

      it("does not consider a partial match valid", () => {
        const data = [
          { id: 1, name: "A" },
          { id: 2, name: "B" },
          { id: 3, name: "C" },
        ];
        const qc = createQueryableClause((t) => t, data);
        expect(qc.deepEquals({ name: "B" } as ElemType<typeof data>)).to.eql(
          [],
        );
      });
    });

    describe("includes", () => {
      it("can confirm that an element matches a provided partial array", () => {
        const data = [
          [1, 2, 3],
          [3, 4, 5],
          [5, 6, 7],
        ];
        const qc = createQueryableClause((t) => t, data);

        expect(qc.includes(5)).to.eql([data[1], data[2]]);
      });
    });
  });

  describe("not", () => {
    it("can negate a query clause", () => {
      const data = [
        { str: "a", num: 1, bool: true },
        { str: "b", num: 2, bool: false },
      ];
      const qc = createQueryableClause((t) => t.bool, data);
      expect(qc.not.is(true)).to.eql([data[1]]);
    });
  });

  describe("its", () => {
    it("can filter via where in nested objects", () => {
      const data = [
        { id: "a", role: { id: "r1", name: "Artist" } },
        { id: "b", role: { id: "r2", name: "Backpacker" } },
        { id: "c", role: { id: "r3", name: "Artist" } },
      ];

      expect(
        createQueryableClause((t) => t.role, data)
          .its("name")
          .is("Artist"),
      ).to.eql([data[0], data[2]]);
    });

    it("can filter via where in deeply nested objects", () => {
      const data = [
        { id: "a", details: { role: { name: "Artist" } } },
        { id: "b", details: { role: { name: "Backpacker" } } },
        { id: "c", details: { role: { name: "Artist" } } },
      ];

      expect(
        createQueryableClause((t) => t.details, data)
          .its("role")
          .its("name")
          .is("Artist"),
      ).to.eql([data[0], data[2]]);
    });
  });

  describe("some", () => {
    it("can filter nested arrays with some via where", () => {
      const data = [
        {
          id: "a",
          roles: [
            { id: "r1", name: "Artist" },
            { id: "r2", name: "Backpacker" },
          ],
        },
        {
          id: "b",
          roles: [
            { id: "r2", name: "Backpacker" },
            { id: "r4", name: "Musician" },
          ],
        },
        { id: "c", roles: [{ id: "r1", name: "Artist" }] },
      ];

      expect(
        createQueryableClause((t) => t.roles, data)
          .some()
          .its("name")
          .is("Artist"),
      ).to.eql([data[0], data[2]]);
    });

    it("can filter deeply nested arrays with some via where", () => {
      const data = [
        {
          id: "a",
          roles: [
            [
              ["r1", "Artist"],
              ["r2", "Backpacker"],
            ],
          ],
        },
        {
          id: "b",
          roles: [
            [
              ["r2", "Backpacker"],
              ["r3", "Musician"],
            ],
          ],
        },
        { id: "c", roles: [[["r1", "Artist"]]] },
      ];

      expect(
        createQueryableClause((t) => t.roles, data)
          .some("role")
          .some("extra arbitrary layer")
          .some("role identifier")
          .is("Artist"),
      ).to.eql([data[0], data[2]]);
    });

    it("can filter objects with highly irregular types", () => {
      type T = { a?: number; b?: { c?: string } };
      const data: T[] = [{ a: 1 }, { b: {} }, { b: { c: "abc" } }];
      expect(createQueryableClause((t) => t.a, data).is(1)).to.eql([data[0]]);
    });
  });

  describe("every", () => {
    it("can filter nested arrays with every via where", () => {
      const data = [
        {
          id: "a",
          roles: [
            { id: "r1", name: "Artist" },
            { id: "r2", name: "Backpacker" },
          ],
        },
        {
          id: "b",
          roles: [
            { id: "r2", name: "Backpacker" },
            { id: "r3", name: "Musician" },
          ],
        },
        { id: "c", roles: [{ id: "r1", name: "Artist" }] },
      ];

      expect(
        createQueryableClause((t) => t.roles, data)
          .every()
          .its("name")
          .is("Artist"),
      ).to.eql([data[2]]);
    });

    it("can filter deeply nested arrays with every via where", () => {
      const data = [
        {
          id: "a",
          roles: [[[1, "Artist"]], [[2, "Backpacker"]]],
        },
        {
          id: "b",
          roles: [[[2, "Backpacker"]], [[3, "Musician"]]],
        },
        { id: "c", roles: [[[2, "Artist"]]] },
      ];

      expect(
        createQueryableClause((t) => t.roles, data)
          .every("role")
          .every("extra arbitrary layer")
          .every("role identifier")
          .satisfies((x) => isString(x) || x < 3),
      ).to.eql([data[0], data[2]]);
    });

    it("can filter deeply nested arrays with every and some via where", () => {
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
            [2, "Backpacker"],
            [3, "Musician"],
          ],
        },
        { id: "c", roles: [[2, "Artist"]] },
      ];

      expect(
        createQueryableClause((t) => t.roles, data)
          .every("role")
          .some("role identifier")
          .is("Artist"),
      ).to.eql([data[2]]);

      expect(
        createQueryableClause((t) => t.roles, data)
          .some("role")
          .every("role identifier")
          .is("Artist"),
      ).to.eql([]);
    });
  });

  it("gracefully handles querying when the array is empty", () => {
    expect(
      createQueryableClause<{ id: string }, string>((t) => t.id, []).is("1"),
    ).to.eql([]);
  });
});
