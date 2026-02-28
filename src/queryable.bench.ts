import { bench, describe } from "vitest";
import { queryable } from "./queryable";

const SMALL_ARRAY = Array.from({ length: 99 }, (_, i) => ({
  id: i % 10,
  name: `item-${i % 20}`,
  type: i % 3 === 0 ? "a" : "b",
  score: i,
}));

const MEDIUM_ARRAY = Array.from({ length: 9_999 }, (_, i) => ({
  id: i % 10,
  name: `item-${i % 20}`,
  type: i % 3 === 0 ? "a" : "b",
  score: i,
}));

const LARGE_ARRAY = Array.from({ length: 999_999 }, (_, i) => ({
  id: i % 10,
  name: `item-${i % 20}`,
  type: i % 3 === 0 ? "a" : "b",
  score: i,
}));

const ARRAY_WITH_NESTED = Array.from({ length: 9_999 }, (_, i) => ({
  id: i,
  tags: [`tag-${i % 5}`, `tag-${(i + 1) % 5}`],
  details: { category: i % 4 === 0 ? "premium" : "standard", score: i },
}));

const SMALL_QUERYABLE = queryable(SMALL_ARRAY);
const MEDIUM_QUERYABLE = queryable(MEDIUM_ARRAY);
const LARGE_QUERYABLE = queryable(LARGE_ARRAY);
const NESTED_QUERYABLE = queryable(ARRAY_WITH_NESTED);

describe("query array benchmarks", () => {
  describe("instantiation", () => {
    describe("small dataset", () => {
      bench("new QueryArray", () => {
        queryable(SMALL_ARRAY);
      });

      // because there is so much variance in array creation for smaller arrays
      // we're opting for a worse implementation here to keep it closer to
      // what the query array will need to do
      bench("new Array via naive loop (baseline)", () => {
        const newArr = new Array(SMALL_ARRAY.length);
        let idx = SMALL_ARRAY.length;
        while (idx--) {
          newArr[idx] = SMALL_ARRAY[idx];
        }
      });
    });

    describe("medium dataset", () => {
      bench("new QueryArray", () => {
        queryable(MEDIUM_ARRAY);
      });
      // because there is so much variance in array creation for smaller arrays
      // we're opting for a worse implementation here to keep it closer to
      // what the query array will need to do
      bench("new Array via naive loop (baseline)", () => {
        const newArr = new Array(MEDIUM_ARRAY.length);
        let idx = MEDIUM_ARRAY.length;
        while (idx--) {
          newArr[idx] = MEDIUM_ARRAY[idx];
        }
      });
    });

    describe("large dataset", () => {
      bench("new QueryArray", () => {
        queryable(LARGE_ARRAY);
      });

      // with a larger array, we measure between the more performant cases
      // and our implementation
      bench("new Array via spread (baseline)", () => {
        [...LARGE_ARRAY];
      });
    });
  });

  describe("filter", () => {
    describe("small dataset", () => {
      bench("QueryArray.filter", () => {
        SMALL_QUERYABLE.filter((x) => x.id === 5);
      });
      bench("Array.filter (baseline)", () => {
        SMALL_ARRAY.filter((x) => x.id === 5);
      });
    });

    describe("medium dataset", () => {
      bench("QueryArray.filter", () => {
        MEDIUM_QUERYABLE.filter((x) => x.id === 5);
      });
      bench("Array.filter (baseline)", () => {
        MEDIUM_ARRAY.filter((x) => x.id === 5);
      });
    });

    describe("large dataset", () => {
      bench("QueryArray.filter", () => {
        LARGE_QUERYABLE.filter((x) => x.id === 5);
      });
      bench("Array.filter (baseline)", () => {
        LARGE_ARRAY.filter((x) => x.id === 5);
      });
    });
  });

  describe.only("where.is", () => {
    describe("small dataset", () => {
      bench("QueryArray.where.is", () => {
        SMALL_QUERYABLE.where("id").is(5);
      });
      bench("Array.filter (baseline)", () => {
        SMALL_ARRAY.filter((x) => x.id === 5);
      });
    });

    describe("medium dataset", () => {
      bench("QueryArray.where.is", () => {
        MEDIUM_QUERYABLE.where("id").is(5);
      });
      bench("Array.filter (baseline)", () => {
        MEDIUM_ARRAY.filter((x) => x.id === 5);
      });
    });

    describe("large dataset", () => {
      bench("QueryArray.where.is", () => {
        LARGE_QUERYABLE.where("id").is(5);
      });
      bench("Array.filter (baseline)", () => {
        LARGE_ARRAY.filter((x) => x.id === 5);
      });
    });
  });

  describe("where.satisfies", () => {
    describe("small dataset", () => {
      bench("QueryArray.where.satisfies", () => {
        SMALL_QUERYABLE.where("score").satisfies((s) => s > 50 && s < 70);
      });
      bench("Array.filter (baseline)", () => {
        SMALL_ARRAY.filter((x) => x.score > 50 && x.score < 70);
      });
    });

    describe("medium dataset", () => {
      bench("QueryArray.where.satisfies", () => {
        MEDIUM_QUERYABLE.where("score").satisfies((s) => s > 5000 && s < 7000);
      });
      bench("Array.filter (baseline)", () => {
        MEDIUM_ARRAY.filter((x) => x.score > 5000 && x.score < 7000);
      });
    });

    describe("large dataset", () => {
      bench("QueryArray.where.satisfies", () => {
        LARGE_QUERYABLE.where("score").satisfies(
          (s) => s > 500_000 && s < 700_000,
        );
      });
      bench("Array.filter (baseline)", () => {
        LARGE_ARRAY.filter((x) => x.score > 500_000 && x.score < 700_000);
      });
    });
  });

  describe("chained and", () => {
    describe("small dataset", () => {
      bench("QueryArray.where.and.where", () => {
        SMALL_QUERYABLE.where("type")
          .is("a")
          .and.where("score")
          .greaterThan(50);
      });
      bench("Array.filter chain (baseline)", () => {
        SMALL_ARRAY.filter((x) => x.type === "a").filter((x) => x.score > 50);
      });
    });

    describe("medium dataset", () => {
      bench("QueryArray.where.and.where", () => {
        MEDIUM_QUERYABLE.where("type")
          .is("a")
          .and.where("score")
          .greaterThan(5000);
      });
      bench("Array.filter chain (baseline)", () => {
        MEDIUM_ARRAY.filter((x) => x.type === "a").filter(
          (x) => x.score > 5000,
        );
      });
    });

    describe("large dataset", () => {
      bench("QueryArray.where.and.where", () => {
        LARGE_QUERYABLE.where("type")
          .is("a")
          .and.where("score")
          .greaterThan(500_000);
      });
      bench("Array.filter chain (baseline)", () => {
        LARGE_ARRAY.filter((x) => x.type === "a").filter(
          (x) => x.score > 500_000,
        );
      });
    });
  });

  describe.only("chained or", () => {
    describe.only("small dataset", () => {
      bench("QueryArray.where.or.where", () => {
        SMALL_QUERYABLE.where("type").is("a").or.where("id").is(7);
      });
      bench("QueryArray sequential queries", () => {
        SMALL_QUERYABLE.where("type").is("a");
        SMALL_QUERYABLE.where("id").is(7);
      });
      bench("Array.filter with Set dedup (baseline)", () => {
        const filteredByType = SMALL_ARRAY.filter((x) => x.type === "a");
        const filteredById = SMALL_ARRAY.filter((x) => x.id === 7);
        [...new Set([...filteredByType, ...filteredById])];
      });
    });

    describe("medium dataset", () => {
      bench("QueryArray.where.or.where", () => {
        MEDIUM_QUERYABLE.where("type").is("a").or.where("id").is(7);
      });
      bench("Array.filter with Set dedup (baseline)", () => {
        const filteredByType = MEDIUM_ARRAY.filter((x) => x.type === "a");
        const filteredById = MEDIUM_ARRAY.filter((x) => x.id === 7);
        [...new Set(filteredByType.concat(filteredById))];
      });
    });

    describe("large dataset", () => {
      bench("QueryArray.where.or.where", () => {
        LARGE_QUERYABLE.where("type").is("a").or.where("id").is(7);
      });
      bench("Array.filter with Set dedup (baseline)", () => {
        const filteredByType = LARGE_ARRAY.filter((x) => x.type === "a");
        const filteredById = LARGE_ARRAY.filter((x) => x.id === 7);
        [...new Set(filteredByType.concat(filteredById))];
      });
    });
  });

  describe("where.some.is", () => {
    describe("medium dataset", () => {
      bench("QueryArray.where.some.is", () => {
        NESTED_QUERYABLE.where("tags").some().is("tag-3");
      });
      bench("Array.filter + Array.includes (baseline)", () => {
        ARRAY_WITH_NESTED.filter((x) => x.tags.includes("tag-3"));
      });
    });
  });

  describe("where.matches", () => {
    describe("medium dataset", () => {
      bench("QueryArray.where.matches", () => {
        NESTED_QUERYABLE.where("details").matches({ category: "premium" });
      });
      bench("Array.filter (baseline)", () => {
        ARRAY_WITH_NESTED.filter((x) => x.details.category === "premium");
      });
    });
  });

  describe("sortBy", () => {
    describe("small dataset", () => {
      bench("QueryArray.sortBy", () => {
        queryable([...SMALL_ARRAY]).sortBy("score", "desc");
      });
      bench("Array.sort (baseline)", () => {
        queryable([...SMALL_ARRAY])
          .sort((a, b) => a.score - b.score)
          .reverse();
      });
    });

    describe("medium dataset", () => {
      bench("QueryArray.sortBy", () => {
        queryable([...MEDIUM_ARRAY]).sortBy("score", "desc");
      });
      bench("Array.sort (baseline)", () => {
        queryable([...MEDIUM_ARRAY])
          .sort((a, b) => a.score - b.score)
          .reverse();
      });
    });

    describe("large dataset", () => {
      bench("QueryArray.sortBy", () => {
        queryable([...LARGE_ARRAY]).sortBy("score", "desc");
      });
      bench("Array.sort (baseline)", () => {
        queryable([...LARGE_ARRAY])
          .sort((a, b) => a.score - b.score)
          .reverse();
      });
    });
  });

  describe("groupBy", () => {
    describe("small dataset", () => {
      bench("QueryArray.groupBy", () => {
        SMALL_QUERYABLE.groupBy("type");
      });
      bench("manual groupBy (baseline)", () => {
        const out: Record<string, typeof SMALL_ARRAY> = {};
        for (const x of SMALL_ARRAY) {
          (out[x.type] ??= []).push(x);
        }
      });
    });

    describe("medium dataset", () => {
      bench("QueryArray.groupBy", () => {
        MEDIUM_QUERYABLE.groupBy("type");
      });
      bench("manual groupBy (baseline)", () => {
        const out: Record<string, typeof MEDIUM_ARRAY> = {};
        for (const x of MEDIUM_ARRAY) {
          (out[x.type] ??= []).push(x);
        }
      });
    });

    describe("large dataset", () => {
      bench("QueryArray.groupBy", () => {
        LARGE_QUERYABLE.groupBy("type");
      });
      bench("manual groupBy (baseline)", () => {
        const out: Record<string, typeof LARGE_ARRAY> = {};
        for (const x of LARGE_ARRAY) {
          (out[x.type] ??= []).push(x);
        }
      });
    });
  });

  describe("uniqueBy", () => {
    describe("small dataset", () => {
      bench("QueryArray.uniqueBy", () => {
        queryable([...SMALL_ARRAY]).uniqueBy("id");
      });
      bench("manual uniqueBy with Set (baseline)", () => {
        const seen = new Set<number>();
        const out = [];
        queryable([...SMALL_ARRAY]).forEach((x) => {
          if (!seen.has(x.id)) {
            out.push(x);
            seen.add(x.id);
          }
        });
      });
    });

    describe("medium dataset", () => {
      bench("QueryArray.uniqueBy", () => {
        queryable([...MEDIUM_ARRAY]).uniqueBy("id");
      });
      bench("manual uniqueBy with Set (baseline)", () => {
        const seen = new Set<number>();
        const out = [];
        queryable([...MEDIUM_ARRAY]).forEach((x) => {
          if (!seen.has(x.id)) {
            out.push(x);
            seen.add(x.id);
          }
        });
      });
    });

    describe("large dataset", () => {
      bench("QueryArray.uniqueBy", () => {
        queryable([...LARGE_ARRAY]).uniqueBy("id");
      });
      bench("manual uniqueBy with Set (baseline)", () => {
        const seen = new Set<number>();
        const out = [];
        queryable([...LARGE_ARRAY]).forEach((x) => {
          if (!seen.has(x.id)) {
            out.push(x);
            seen.add(x.id);
          }
        });
      });
    });
  });
});
