import { bench, describe } from "vitest";
import { queryable } from "./queryable";
import { isMatch } from "./utils";

const SMALL_ARRAY = Array.from({ length: 999 }, (_, i) => ({
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
        queryable([...SMALL_ARRAY]).filter((x) => x.id === 5);
      });
      bench("Array.filter (baseline)", () => {
        queryable([...SMALL_ARRAY]).data.filter((x) => x.id === 5);
      });
    });

    describe("medium dataset", () => {
      bench("QueryArray.filter", () => {
        queryable([...MEDIUM_ARRAY]).filter((x) => x.id === 5);
      });
      bench("Array.filter (baseline)", () => {
        queryable([...MEDIUM_ARRAY]).data.filter((x) => x.id === 5);
      });
    });

    describe("large dataset", () => {
      const LARGE_QUERYABLE = queryable(LARGE_ARRAY);
      bench("QueryArray.filter", () => {
        queryable([...LARGE_ARRAY]).filter((x) => x.id === 5);
      });
      bench("Array.filter (baseline)", () => {
        queryable([...LARGE_ARRAY]).data.filter((x) => x.id === 5);
      });
    });
  });

  describe("where.is", () => {
    describe("small dataset", () => {
      bench("QueryArray.where.is", () => {
        queryable([...SMALL_ARRAY])
          .where("id")
          .is(5);
      });
      bench("Array.filter (baseline)", () => {
        queryable([...SMALL_ARRAY]).data.filter((x) => x.id === 5);
      });
    });

    describe("medium dataset", () => {
      bench("QueryArray.where.is", () => {
        queryable([...MEDIUM_ARRAY])
          .where("id")
          .is(5);
      });
      bench("Array.filter (baseline)", () => {
        queryable([...MEDIUM_ARRAY]).data.filter((x) => x.id === 5);
      });
    });

    describe("large dataset", () => {
      bench("QueryArray.where.is", () => {
        queryable([...LARGE_ARRAY])
          .where("id")
          .is(5);
      });
      bench("Array.filter (baseline)", () => {
        queryable([...LARGE_ARRAY]).data.filter((x) => x.id === 5);
      });
    });
  });

  describe("where.satisfies", () => {
    describe("small dataset", () => {
      bench("QueryArray.where.satisfies", () => {
        queryable([...SMALL_ARRAY])
          .where("score")
          .satisfies((s) => s > 50 && s < 70);
      });
      bench("Array.filter (baseline)", () => {
        queryable([...SMALL_ARRAY]).data.filter(
          (x) => x.score > 50 && x.score < 70,
        );
      });
    });

    describe("medium dataset", () => {
      bench("QueryArray.where.satisfies", () => {
        queryable([...MEDIUM_ARRAY])
          .where("score")
          .satisfies((s) => s > 5000 && s < 7000);
      });
      bench("Array.filter (baseline)", () => {
        queryable([...MEDIUM_ARRAY]).data.filter(
          (x) => x.score > 5000 && x.score < 7000,
        );
      });
    });

    describe("large dataset", () => {
      bench("QueryArray.where.satisfies", () => {
        queryable([...LARGE_ARRAY])
          .where("score")
          .satisfies((s) => s > 500_000 && s < 700_000);
      });
      bench("Array.filter (baseline)", () => {
        queryable([...LARGE_ARRAY]).data.filter(
          (x) => x.score > 500_000 && x.score < 700_000,
        );
      });
    });
  });

  describe("chained or", () => {
    describe("small dataset", () => {
      bench("QueryArray.where.or.where", () => {
        queryable([...SMALL_ARRAY])
          .where("type")
          .is("a")
          .or.where("score")
          .greaterThan(50);
      });

      bench("Array.filter with Set dedup (baseline)", () => {
        const queryData = queryable([...SMALL_ARRAY]).data;
        const filteredByType = queryData.filter((x) => x.type === "a");
        const filteredById = queryData.filter((x) => x.score > 50);
        [...new Set([...filteredByType, ...filteredById])];
      });
    });

    describe("medium dataset", () => {
      bench("QueryArray.where.or.where", () => {
        queryable([...MEDIUM_ARRAY])
          .where("type")
          .is("a")
          .or.where("id")
          .is(7);
      });
      bench("Array.filter with Set dedup (baseline)", () => {
        const queryData = queryable([...MEDIUM_ARRAY]).data;
        const filteredByType = queryData.filter((x) => x.type === "a");
        const filteredById = queryData.filter((x) => x.id === 7);
        [...new Set(filteredByType.concat(filteredById))];
      });
    });

    describe("large dataset", () => {
      bench("QueryArray.where.or.where", () => {
        queryable([...LARGE_ARRAY])
          .where("type")
          .is("a")
          .or.where("id")
          .is(7);
      });
      bench("Array.filter with Set dedup (baseline)", () => {
        const queryData = queryable([...LARGE_ARRAY]).data;
        const filteredByType = queryData.filter((x) => x.type === "a");
        const filteredById = queryData.filter((x) => x.id === 7);
        [...new Set(filteredByType.concat(filteredById))];
      });
    });
  });

  describe("chained and", () => {
    describe("small dataset", () => {
      bench("QueryArray.where.and.where", () => {
        queryable([...SMALL_ARRAY])
          .where("type")
          .is("a")
          .and.where("score")
          .greaterThan(50);
      });
      bench("Array.filter chain (baseline)", () => {
        queryable([...SMALL_ARRAY])
          .data.filter((x) => x.type === "a")
          .filter((x) => x.score > 50);
      });
    });

    describe("medium dataset", () => {
      bench("QueryArray.where.and.where", () => {
        queryable([...MEDIUM_ARRAY])
          .where("type")
          .is("a")
          .and.where("score")
          .greaterThan(5000);
      });
      bench("Array.filter chain (baseline)", () => {
        queryable([...MEDIUM_ARRAY])
          .data.filter((x) => x.type === "a")
          .filter((x) => x.score > 5000);
      });
    });

    describe("large dataset", () => {
      bench("QueryArray.where.and.where", () => {
        queryable([...LARGE_ARRAY])
          .where("type")
          .is("a")
          .and.where("score")
          .greaterThan(500_000);
      });
      bench("Array.filter chain (baseline)", () => {
        queryable([...LARGE_ARRAY])
          .data.filter((x) => x.type === "a")
          .filter((x) => x.score > 500_000);
      });
    });
  });

  describe("where.some.is", () => {
    bench("QueryArray.where.some.is", () => {
      queryable([...ARRAY_WITH_NESTED])
        .where("tags")
        .some()
        .is("tag-3");
    });
    bench("Array.filter + Array.some (baseline)", () => {
      queryable([...ARRAY_WITH_NESTED]).data.filter((x) =>
        x.tags.some((t) => "tag-3"),
      );
    });
  });

  describe("where.every.is", () => {
    bench("QueryArray.where.every.is", () => {
      queryable([...ARRAY_WITH_NESTED])
        .where("tags")
        .every()
        .is("tag-3");
    });
    bench("Array.filter + Array.every (baseline)", () => {
      queryable([...ARRAY_WITH_NESTED]).data.filter((x) =>
        x.tags.every((t) => t === "tag-3"),
      );
    });
  });

  describe("where.matches", () => {
    bench("QueryArray.where.matches", () => {
      queryable([...ARRAY_WITH_NESTED])
        .where("details")
        .matches({ category: "premium" });
    });
    bench("Array.filter (baseline)", () => {
      queryable([...ARRAY_WITH_NESTED]).data.filter((x) =>
        isMatch(x.details, { category: "premium" }),
      );
    });
  });

  describe("sortBy", () => {
    describe("small dataset", () => {
      bench("QueryArray.sortBy", () => {
        queryable([...SMALL_ARRAY]).sortBy("score", "desc");
      });
      bench("Array.sort (baseline)", () => {
        queryable([...SMALL_ARRAY])
          .data.sort((a, b) => a.score - b.score)
          .reverse();
      });
    });

    describe("medium dataset", () => {
      bench("QueryArray.sortBy", () => {
        queryable([...MEDIUM_ARRAY]).sortBy("score", "desc");
      });
      bench("Array.sort (baseline)", () => {
        queryable([...MEDIUM_ARRAY])
          .data.sort((a, b) => a.score - b.score)
          .reverse();
      });
    });

    describe("large dataset", () => {
      bench("QueryArray.sortBy", () => {
        queryable([...LARGE_ARRAY]).sortBy("score", "desc");
      });
      bench("Array.sort (baseline)", () => {
        queryable([...LARGE_ARRAY])
          .data.sort((a, b) => a.score - b.score)
          .reverse();
      });
    });
  });

  describe("groupBy", () => {
    describe("small dataset", () => {
      bench("QueryArray.groupBy", () => {
        queryable([...SMALL_ARRAY]).groupBy("type");
      });
      bench("manual groupBy (baseline)", () => {
        const out: Record<string, typeof SMALL_ARRAY> = {};
        const queryData = queryable([...SMALL_ARRAY]).data;
        for (const x of queryData) {
          (out[x.type] ??= []).push(x);
        }
      });
    });

    describe("medium dataset", () => {
      bench("QueryArray.groupBy", () => {
        queryable([...MEDIUM_ARRAY]).groupBy("type");
      });
      bench("manual groupBy (baseline)", () => {
        const out: Record<string, typeof MEDIUM_ARRAY> = {};
        const queryData = queryable([...MEDIUM_ARRAY]).data;
        for (const x of queryData) {
          (out[x.type] ??= []).push(x);
        }
      });
    });

    describe("large dataset", () => {
      bench("QueryArray.groupBy", () => {
        queryable([...LARGE_ARRAY]).groupBy("type");
      });
      bench("manual groupBy (baseline)", () => {
        const out: Record<string, typeof LARGE_ARRAY> = {};
        const queryData = queryable([...LARGE_ARRAY]).data;
        for (const x of queryData) {
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
        queryable([...SMALL_ARRAY]).data.forEach((x) => {
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
        queryable([...MEDIUM_ARRAY]).data.forEach((x) => {
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
        queryable([...LARGE_ARRAY]).data.forEach((x) => {
          if (!seen.has(x.id)) {
            out.push(x);
            seen.add(x.id);
          }
        });
      });
    });
  });
});
