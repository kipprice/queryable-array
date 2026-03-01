import { queryable, ql } from "./queryable";
import { describe, it, expect } from "vitest";
import { QueryableArray } from "./queryableArray";
import { isString } from "./typeChecks";

describe("queryable", () => {
  it("exists", () => {
    expect(queryable).to.be.ok;
    expect(ql).to.eq(queryable);
  });

  it("returns a query array when the data provided is an array", () => {
    expect(queryable(data)).to.be.instanceOf(QueryableArray);
  });

  it("returns the data provided wrapped in an array if the data was not in an array to start", () => {
    expect(queryable({})).to.eql([{}]);
    expect(queryable(7)).to.eql([7]);
  });

  describe("where", () => {
    describe("filtering & processing", () => {
      it("can filter, then apply a sort", () => {
        const data = [{ id: "2" }, { id: "1" }, { id: "3" }];
        expect(queryable(data).where("id").not.eq("3").sortBy("id")).to.eql([
          data[1],
          data[0],
        ]);
      });

      it("can filter, then apply an index", () => {
        const data = [{ id: "2" }, { id: "1" }, { id: "3" }];
        expect(queryable(data).where("id").not.eq("3").indexBy("id")).to.eql({
          1: data[1],
          2: data[0],
        });
      });

      it("can filter, then apply an grouping", () => {
        const data = [
          { id: "2", type: "person" },
          { id: "1", type: "plant" },
          { id: "3", type: "person" },
          { id: "4", type: "plant" },
        ];
        expect(queryable(data).where("id").not.eq("3").groupBy("type")).to.eql({
          person: [data[0]],
          plant: [data[1], data[3]],
        });
      });

      it("can sort, then apply a filter", () => {
        const data = [{ id: "2" }, { id: "1" }, { id: "3" }];
        expect(queryable(data).sortBy("id").where("id").not.eq("3")).to.eql([
          data[1],
          data[0],
        ]);
      });
    });

    describe("is", () => {
      it("can filter in by equality to a property name and value", () => {
        expect(
          queryable([{ a: 1 }, { a: 2 }, { a: 1 }])
            .where("a")
            .is(1),
        ).to.eql([{ a: 1 }, { a: 1 }]);
      });

      it("can filter in by equality to a value getter", () => {
        expect(
          queryable([{ a: 1 }, { a: 2 }, { a: 1 }])
            .where((x) => x.a)
            .is(1),
        ).to.eql([{ a: 1 }, { a: 1 }]);
      });

      it("can filter in by equality via the synonym 'eq'", () => {
        expect(
          queryable([{ a: 1 }, { a: 2 }, { a: 1 }])
            .where("a")
            .eq(1),
        ).to.eql([{ a: 1 }, { a: 1 }]);
      });

      it("can filter in by equality via the synonym 'equals'", () => {
        expect(
          queryable([{ a: 1 }, { a: 2 }, { a: 1 }])
            .where("a")
            .equals(1),
        ).to.eql([{ a: 1 }, { a: 1 }]);
      });

      it("can filter out by equality to a property name and value", () => {
        expect(
          queryable([{ a: 1 }, { a: 2 }, { a: 1 }])
            .where("a")
            .not.is(1),
        ).to.eql([{ a: 2 }]);
      });
    });

    describe("isNull", () => {
      it("can filter by 'isNull' via a property containing data", () => {
        expect(
          queryable([{ a: [1, 2] }, { a: [2, 3] }, { a: null }])
            .where("a")
            .isNull(),
        ).to.eql([{ a: null }]);
      });

      it("can filter by 'isNull' via a value getter", () => {
        expect(
          queryable([{ a: [1, 2] }, { a: [null, 3] }, { a: [1, null] }])
            .where((v) => v.a?.[0])
            .isNull(),
        ).to.eql([{ a: [null, 3] }]);
      });

      it("can filter out by 'isNull' via a property not containing data", () => {
        expect(
          queryable([{ a: [1, 2] }, { a: [2, 3] }, { a: null }])
            .where("a")
            .not.isNull(),
        ).to.eql([{ a: [1, 2] }, { a: [2, 3] }]);
      });
    });

    describe("isUndefined", () => {
      it("can filter by 'isUndefined' via a property containing data", () => {
        expect(
          queryable([{ a: [1, 2] }, { a: [2, 3] }, { a: undefined }])
            .where("a")
            .isUndefined(),
        ).to.eql([{ a: undefined }]);
      });

      it("can filter by 'isUndefined' via a value getter", () => {
        expect(
          queryable([
            { a: [1, 2] },
            { a: [undefined, 3] },
            { a: [1, undefined] },
          ])
            .where((v) => v.a?.[0])
            .isUndefined(),
        ).to.eql([{ a: [undefined, 3] }]);
      });

      it("can filter out by 'isUndefined' via a property not containing data", () => {
        expect(
          queryable([{ a: [1, 2] }, { a: [2, 3] }, { a: undefined }])
            .where("a")
            .not.isUndefined(),
        ).to.eql([{ a: [1, 2] }, { a: [2, 3] }]);
      });
    });

    describe("isNullish", () => {
      it("can filter by 'isNullish' via a property containing data", () => {
        expect(
          queryable([{ a: [1, 2] }, { a: undefined }, { a: null }])
            .where("a")
            .isNullish(),
        ).to.eql([{ a: undefined }, { a: null }]);
      });

      it("can filter by 'isNullish' via a value getter", () => {
        expect(
          queryable([{ a: [undefined, 2] }, { a: [null, 3] }, { a: [1, null] }])
            .where((v) => v.a?.[0])
            .isNullish(),
        ).to.eql([{ a: [undefined, 2] }, { a: [null, 3] }]);
      });

      it("can filter out by 'isNull' via a property not containing data", () => {
        expect(
          queryable([{ a: [1, 2] }, { a: undefined }, { a: null }])
            .where("a")
            .not.isNullish(),
        ).to.eql([{ a: [1, 2] }]);
      });
    });

    describe("in", () => {
      it("can filter in by 'in' to a property name and value", () => {
        expect(
          queryable([{ a: 1 }, { a: 2 }, { a: 1 }])
            .where("a")
            .in([1, 10]),
        ).to.eql([{ a: 1 }, { a: 1 }]);
      });

      it("can filter in by 'in' to a value getter", () => {
        expect(
          queryable([{ a: 1 }, { a: 2 }, { a: 1 }])
            .where((x) => x.a * 2)
            .in([2, 10]),
        ).to.eql([{ a: 1 }, { a: 1 }]);
      });

      it("can filter out by 'in' to a property name and value", () => {
        expect(
          queryable([{ a: 1 }, { a: 2 }, { a: 1 }])
            .where("a")
            .not.in([1, 10]),
        ).to.eql([{ a: 2 }]);
      });
    });

    describe("greaterThan", () => {
      it("can filter in by 'greaterThan' to a property name and value", () => {
        expect(
          queryable([{ a: 1 }, { a: 2 }, { a: 1 }])
            .where("a")
            .greaterThan(1),
        ).to.eql([{ a: 2 }]);
      });

      it("can filter in by 'greaterThan' to a value getter", () => {
        expect(
          queryable([{ a: 1 }, { a: 2 }, { a: 1 }])
            .where((x) => x.a)
            .greaterThan(1),
        ).to.eql([{ a: 2 }]);
      });

      it("can filter in by 'greaterThan' via the synonym 'gt'", () => {
        expect(
          queryable([{ a: 1 }, { a: 2 }, { a: 1 }])
            .where("a")
            .gt(1),
        ).to.eql([{ a: 2 }]);
      });

      it("can filter out by 'greaterThan' to a property name and value", () => {
        expect(
          queryable([{ a: 1 }, { a: 2 }, { a: 1 }])
            .where("a")
            .not.greaterThan(1),
        ).to.eql([{ a: 1 }, { a: 1 }]);
      });

      it("ignores values that are undefined for greaterThan", () => {
        expect(
          queryable([{ a: 1 }, { a: 2 }, {}])
            .where("a")
            .greaterThan(1),
        ).to.eql([{ a: 2 }]);
      });
    });

    describe("greaterThanOrEqualTo", () => {
      it("can filter in by 'greaterThanOrEqualTo' to a property name and value", () => {
        expect(
          queryable([{ a: 1 }, { a: 3 }, { a: 2 }])
            .where("a")
            .greaterThanOrEqualTo(2),
        ).to.eql([{ a: 3 }, { a: 2 }]);
      });

      it("can filter in by 'greaterThanOrEqualTo' to a value getter", () => {
        expect(
          queryable([{ a: 1 }, { a: 3 }, { a: 2 }])
            .where((x) => x.a)
            .greaterThanOrEqualTo(2),
        ).to.eql([{ a: 3 }, { a: 2 }]);
      });

      it("can filter in by 'greaterThanOrEqualTo' via the synonym 'gte'", () => {
        expect(
          queryable([{ a: 1 }, { a: 3 }, { a: 2 }])
            .where("a")
            .gte(2),
        ).to.eql([{ a: 3 }, { a: 2 }]);
      });

      it("can filter out by 'greaterThanOrEqualTon' to a property name and value", () => {
        expect(
          queryable([{ a: 1 }, { a: 3 }, { a: 2 }])
            .where("a")
            .not.greaterThanOrEqualTo(2),
        ).to.eql([{ a: 1 }]);
      });

      it("ignores values that are undefined for greaterThanOrEqualTo", () => {
        expect(
          queryable([{ a: 1 }, { a: 2 }, {}])
            .where("a")
            .greaterThanOrEqualTo(1),
        ).to.eql([{ a: 1 }, { a: 2 }]);
      });
    });

    describe("lessThan", () => {
      it("can filter in by 'lessThan' to a property name and value", () => {
        expect(
          queryable([{ a: 1 }, { a: 2 }, { a: 1 }])
            .where("a")
            .lessThan(2),
        ).to.eql([{ a: 1 }, { a: 1 }]);
      });

      it("can filter in by 'lessThan' to a value getter", () => {
        expect(
          queryable([{ a: 1 }, { a: 2 }, { a: 1 }])
            .where((x) => x.a)
            .lessThan(2),
        ).to.eql([{ a: 1 }, { a: 1 }]);
      });

      it("can filter in by 'lessThan' via the synonym 'lt'", () => {
        expect(
          queryable([{ a: 1 }, { a: 2 }, { a: 1 }])
            .where("a")
            .lt(2),
        ).to.eql([{ a: 1 }, { a: 1 }]);
      });

      it("can filter out by 'lessThan' to a property name and value", () => {
        expect(
          queryable([{ a: 1 }, { a: 2 }, { a: 1 }])
            .where("a")
            .not.lessThan(2),
        ).to.eql([{ a: 2 }]);
      });

      it("ignores values that are undefined for lessThan", () => {
        expect(
          queryable([{ a: 1 }, { a: 2 }, {}])
            .where("a")
            .lessThan(2),
        ).to.eql([{ a: 1 }]);
      });
    });

    describe("lessThanOrEqualTo", () => {
      it("can filter in by 'lessThanOrEqualTo' to a property name and value", () => {
        expect(
          queryable([{ a: 1 }, { a: 3 }, { a: 2 }])
            .where("a")
            .lessThanOrEqualTo(2),
        ).to.eql([{ a: 1 }, { a: 2 }]);
      });

      it("can filter in by 'lessThanOrEqualTo' to a value getter", () => {
        expect(
          queryable([{ a: 1 }, { a: 3 }, { a: 2 }])
            .where((x) => x.a)
            .lessThanOrEqualTo(2),
        ).to.eql([{ a: 1 }, { a: 2 }]);
      });

      it("can filter in by 'lessThanOrEqualTo' via the synonym 'lte'", () => {
        expect(
          queryable([{ a: 1 }, { a: 3 }, { a: 2 }])
            .where("a")
            .lte(2),
        ).to.eql([{ a: 1 }, { a: 2 }]);
      });

      it("can filter out by 'lessThanOrEqualTo' to a property name and value", () => {
        expect(
          queryable([{ a: 1 }, { a: 3 }, { a: 2 }])
            .where("a")
            .not.lessThanOrEqualTo(2),
        ).to.eql([{ a: 3 }]);
      });

      it("ignores values that are undefined for lessThanOrEqualTo", () => {
        expect(
          queryable([{ a: 1 }, { a: 2 }, {}])
            .where("a")
            .lessThanOrEqualTo(2),
        ).to.eql([{ a: 1 }, { a: 2 }]);
      });
    });

    describe("satisfies", () => {
      it("can filter in by a satisfies fn to a property name and value", () => {
        expect(
          queryable([{ a: 1 }, { a: "2" }, { a: "1" }])
            .where("a")
            .satisfies((a) => isString(a)),
        ).to.eql([{ a: "2" }, { a: "1" }]);
      });

      it("can filter in by a satisfies fn to a value getter", () => {
        expect(
          queryable([{ a: 1 }, { a: "2" }, { a: "1" }])
            .where((x) => x.a)
            .satisfies((a) => isString(a)),
        ).to.eql([{ a: "2" }, { a: "1" }]);
      });

      it("can filter out by a satisfies fn to a property name and value", () => {
        expect(
          queryable([{ a: 1 }, { a: "2" }, { a: "1" }])
            .where("a")
            .not.satisfies((a) => isString(a)),
        ).to.eql([{ a: 1 }]);
      });
    });

    describe("includes", () => {
      it("can filter by a property containing data", () => {
        expect(
          queryable([{ a: [1, 2] }, { a: [2, 3] }, { a: [1, 3] }])
            .where("a")
            .includes(3),
        ).to.eql([{ a: [2, 3] }, { a: [1, 3] }]);
      });

      it("can filter out by a property not containing data", () => {
        expect(
          queryable([{ a: [1, 2] }, { a: [2, 3] }, { a: [1, 3] }])
            .where("a")
            .not.includes(3),
        ).to.eql([{ a: [1, 2] }]);
      });

      it("can handle when an array is empty or undefined", () => {
        expect(
          queryable([{ a: [1, 2] }, { a: [] }, {}])
            .where("a")
            .includes(2),
        ).to.eql([{ a: [1, 2] }]);
      });
    });

    describe("its", () => {
      it("check against sub properties", () => {
        const x = queryable([{ data: { a: 1 } }, { data: { b: 1 } }])
          .where("data")
          .its("a");

        expect(
          queryable([{ data: { a: 1 } }, { data: { b: 1 } }])
            .where("data")
            .its("a")
            .is(1).first,
        ).to.eql({ data: { a: 1 } });
      });

      it("check against sub sub properties", () => {
        const data = [
          { data: { a: { nested: 1 } } },
          { data: { a: { nested: 2 } } },
        ];

        expect(
          queryable(data).where("data").its("a").its("nested").is(2).first,
        ).to.eql({ data: { a: { nested: 2 } } });
      });

      it("can gracefully handle optional direct properties", () => {
        const data: {
          data: { a?: { nested: number }; b?: { nested: number } };
        }[] = [{ data: { a: { nested: 1 } } }, { data: { b: { nested: 2 } } }];

        expect(
          queryable(data).where("data").its("b").its("nested").is(2).first,
        ).to.eql({ data: { b: { nested: 2 } } });
      });

      it("can gracefully handle optional nested properties", () => {
        type T = {
          id: string;
          group?: {
            id: string;
            member?: {
              id: string;
            };
          };
        };
        const data: T[] = [
          {
            id: "1",
            group: {
              id: "g1",
              member: {
                id: "m1",
              },
            },
          },
          {
            id: "2",
          },
          {
            id: "3",
            group: {
              id: "g1",
            },
          },
          undefined as unknown as T,
          {
            id: "3",
            group: {
              id: "g1",
              member: {
                id: "m2",
              },
            },
          },
        ];

        expect(
          queryable(data).where("group").its("member").its("id").is("m2"),
        ).to.eql([data[4]]);
      });
    });

    describe("matches", () => {
      it("can match a partial object", () => {
        expect(
          queryable([{ a: { 1: "a", 2: "b" } }, { a: { 1: "c", 2: "d" } }])
            .where("a")
            .matches({ 1: "c" }),
        ).to.eql([{ a: { 1: "c", 2: "d" } }]);
      });

      it("can negate matching a partial object", () => {
        expect(
          queryable([{ a: { 1: "a", 2: "b" } }, { a: { 1: "c", 2: "d" } }])
            .where("a")
            .not.matches({ 1: "c" }),
        ).to.eql([{ a: { 1: "a", 2: "b" } }]);
      });

      it("can gracefully handle missing objects", () => {
        expect(
          queryable([{}, { a: { 1: "c", 2: "d" } }])
            .where("a")
            .matches({ 1: "c" }),
        ).to.eql([{ a: { 1: "c", 2: "d" } }]);
      });
    });

    describe("deepEquals", () => {
      it("can verify a deep equality of an object", () => {
        expect(
          queryable([{ a: { 1: "a", 2: "b" } }, { a: { 1: "c", 2: "d" } }])
            .where("a")
            .deepEquals({ 2: "b", 1: "a" }),
        ).to.eql([{ a: { 1: "a", 2: "b" } }]);
      });

      it("can negate deeply equalling an  object", () => {
        expect(
          queryable([{ a: { 1: "a", 2: "b" } }, { a: { 1: "c", 2: "d" } }])
            .where("a")
            .not.matches({ 1: "c", 2: "d" }),
        ).to.eql([{ a: { 1: "a", 2: "b" } }]);
      });

      it("can gracefully handle missing objects", () => {
        expect(
          queryable([{}, { a: { 1: "c", 2: "d" } }])
            .where("a")
            .deepEquals({ 1: "c", 2: "d" }),
        ).to.eql([{ a: { 1: "c", 2: "d" } }]);
      });
    });

    describe("some", () => {
      it("use 'some' to extract matching elements by property name", () => {
        const data = [
          { id: 1, tags: ["A", "B"] },
          { id: 2, tags: ["B"] },
          { id: 3, tags: ["A", "C"] },
        ];
        expect(queryable(data).where("tags").some("tag").is("B")).to.eql([
          data[0],
          data[1],
        ]);
      });

      it("use a negated 'some' to exclude matching elements by property name", () => {
        const data = [
          { id: 1, tags: ["A", "B"] },
          { id: 2, tags: ["B"] },
          { id: 3, tags: ["A", "C"] },
        ];
        expect(queryable(data).where("tags").some("tag").not.is("B")).to.eql([
          data[2],
        ]);
      });

      it("can handle accessing 'some' on unset or empty child arrays", () => {
        const data = [
          { id: 1, tags: ["A", "B"] },
          { id: 2, tags: [] },
          { id: 3 },
        ];
        expect(queryable(data).where("tags").some("tag").is("B")).to.eql([
          data[0],
        ]);
      });
    });

    describe("every", () => {
      it("use 'every' to extract matching elements by property name", () => {
        const data = [
          { id: 1, tags: ["A", "B"] },
          { id: 2, tags: ["B"] },
          { id: 3, tags: ["A", "C"] },
        ];
        expect(queryable(data).where("tags").every("tag").is("B")).to.eql([
          data[1],
        ]);
      });

      it("use a negated 'every' to exclude matching elements by property name", () => {
        const data = [
          { id: 1, tags: ["A", "B"] },
          { id: 2, tags: ["B"] },
          { id: 3, tags: ["A", "C"] },
        ];
        expect(queryable(data).where("tags").every("tag").not.is("B")).to.eql([
          data[0],
          data[2],
        ]);
      });

      it("can handle accessing 'every' on unset or empty child arrays", () => {
        const data = [
          { id: 1, tags: ["A", "B"] },
          { id: 2, tags: [] },
          { id: 3 },
        ];
        expect(queryable(data).where("tags").every("tag").is("B")).to.eql([]);
      });
    });

    describe("and combo", () => {
      it("can combine multiple wheres with an and", () => {
        expect(
          queryable([
            { a: 1, b: 1 },
            { a: 2, b: 1 },
            { a: 3, b: 2 },
          ])
            .where("b")
            .is(1)
            .and.where("a")
            .is(2).first,
        ).to.eql({ a: 2, b: 1 });
      });

      it("can chain multiple ands together", () => {
        expect(
          queryable([{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }, { a: 5 }])
            .where("a")
            .not.is(2)
            .and.where("a")
            .not.is(3)
            .and.where((v) => v.a)
            .satisfies((a) => a % 2 === 0),
        ).to.eql([{ a: 4 }]);
      });
    });

    describe("or combo", () => {
      it("can combine multiple wheres with an or", () => {
        expect(
          queryable([
            { a: 1, b: 1 },
            { a: 2, b: 1 },
            { a: 3, b: 2 },
          ])
            .where("b")
            .is(1)
            .or.where("a")
            .is(2),
        ).to.eql([
          { a: 1, b: 1 },
          { a: 2, b: 1 },
        ]);
      });

      it("can chain multiple ors together", () => {
        expect(
          queryable([{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }, { a: 5 }])
            .where("a")
            .is(2)
            .or.where("a")
            .is(3)
            .or.where((v) => v.a)
            .satisfies((a) => a === 5),
        ).to.eql([{ a: 2 }, { a: 3 }, { a: 5 }]);
      });
    });
  });

  describe("complicated data", () => {
    it("can extract a subset of items from complex objects", () => {
      expect(
        ql(data).where("hobbies").some().its("name").is("skateboarding"),
      ).to.eql([data[0], data[1]]);
    });

    it("can chain logic together through complex items", () => {
      expect(
        ql(data)
          .where("hobbies")
          .some()
          .its("name")
          .is("skateboarding")
          .and.where("role")
          .its("id")
          .not.is("r1"),
      ).to.eql([data[1]]);
    });

    it("can filter when direct properties are missing values", () => {
      expect(ql(data).where("age").gt(33)).to.eql([data[0], data[1]]);
    });

    it("can filter when nested properties are missing values", () => {
      expect(ql(data).where("role").its("id").eq("r2")).to.eql([
        data[1],
        data[2],
      ]);
    });

    it("can filter when nested arrays are missing values", () => {
      expect(ql(data).where("hobbies").some().its("id").eq("h2")).to.eql([
        data[1],
        data[3],
      ]);
    });
  });
});

type T = {
  id: string;
  name: string;
  age?: number;
  hobbies?: {
    id: string;
    name: string;
  }[];
  role?: { id: string; name: string };
};

const data: T[] = [
  {
    id: "1",
    name: "A",
    age: 99,
    hobbies: [
      {
        id: "h1",
        name: "skateboarding",
      },
    ],
    role: {
      id: "r1",
      name: "Quite Important",
    },
  },

  {
    id: "2",
    name: "B",
    age: 66,
    hobbies: [
      {
        id: "h1",
        name: "skateboarding",
      },
      {
        id: "h2",
        name: "backpacking",
      },
    ],
    role: {
      id: "r2",
      name: "Less Important",
    },
  },

  {
    id: "3",
    name: "C",
    age: 33,
    role: {
      id: "r2",
      name: "Less Important",
    },
  },
  {
    id: "4",
    name: "D",
    hobbies: [
      {
        id: "h2",
        name: "backpacking",
      },
      {
        id: "h3",
        name: "something else",
      },
    ],
  },
];
