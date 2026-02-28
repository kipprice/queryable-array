import { bench, describe } from "vitest";
import {
  applyLogicToFlattenedGroups,
  arrayToMap,
  bucketMultikeyArray,
  END_GROUP_DIVIDER,
  flattenWithGroups,
  getKeys,
  isDeepEqual,
  isEqual,
  isMatch,
  reLayerGroups,
  START_GROUP_DIVIDER,
} from "./utils";

const LARGE_ARRAY = Array.from({ length: 1_000_000 }, (_, i) => ({
  id: i,
  name: `item-${i % 100}`,
  type: i % 3 === 0 ? "a" : "b",
}));

const MEDIUM_ARRAY = Array.from({ length: 10_000 }, (_, i) => ({
  id: i,
  name: `item-${i % 100}`,
  type: i % 3 === 0 ? "a" : "b",
}));

const NESTED_ARRAY = Array.from({ length: 10_000 }, (_, i) => [i, i + 1]);
const FLAT_NESTED = flattenWithGroups(NESTED_ARRAY);

const DEEP_OBJECT = {
  id: 1,
  name: "item-x",
  type: "a",
  roles: MEDIUM_ARRAY,
  details: {
    description: "abc",
  },
};

describe.skip("utils benchmarks", () => {
  describe("getKeys", () => {
    const obj = DEEP_OBJECT;
    bench("getKeys", () => {
      getKeys(obj);
    });
    bench("Object.keys (baseline)", () => {
      Object.keys(obj);
    });
  });

  describe("arrayToMap", () => {
    bench("arrayToMap", () => {
      arrayToMap(MEDIUM_ARRAY, (e) => e.id);
    });
    bench("reduce (baseline)", () => {
      MEDIUM_ARRAY.reduce((acc, e) => ({ ...acc, [e.id]: e }), {} as any);
    });
  });

  describe("bucketMultikeyArray", () => {
    bench("bucketMultikeyArray", () => {
      bucketMultikeyArray(MEDIUM_ARRAY, (e) => [e.type]);
    });
    bench("manual loop (baseline)", () => {
      const tmp: Record<string, typeof MEDIUM_ARRAY> = {};
      for (const e of MEDIUM_ARRAY) {
        (tmp[e.type] ??= []).push(e);
      }
    });
  });

  describe("isEqual (by value)", () => {
    const a = LARGE_ARRAY[0];
    const b = { ...LARGE_ARRAY[0] };
    bench("isEqual", () => {
      isEqual(a, b);
    });
    bench("JSON.stringify (baseline)", () => {
      JSON.stringify(a) === JSON.stringify(b);
    });
  });

  describe("isEqual (by reference)", () => {
    const a = LARGE_ARRAY[0];
    bench("isEqual (primitive)", () => {
      isEqual(42, 42);
    });
    bench("=== (baseline)", () => {
      42 === 42;
    });
    bench("isEqual (object reference)", () => {
      isEqual(a, a);
    });
    bench("=== (object reference) (baseline)", () => {
      a === a;
    });
  });

  describe("isMatch", () => {
    const a = DEEP_OBJECT;
    const b = {
      details: {
        description: a.details.description,
      },
    };

    bench("isMatch", () => {
      isMatch(a, b);
    });

    bench("recursive is partial match (baseline)", () => {
      const recursible = (o: any, x: any) => {
        if (typeof x === "object" && typeof x === "object") {
          const keys = Object.keys(x);
          for (const key of keys) {
            if (!recursible(o[key], x[key])) {
              return false;
            }
          }
          return true;
        } else {
          return o === x;
        }
      };
      recursible(a, b);
    });
  });

  describe("isDeepEqual", () => {
    const a = DEEP_OBJECT;
    const b = {
      id: a.id,
      name: a.name,
      type: a.type,
      roles: a.roles,
      details: {
        description: a.details.description,
      },
    };
    bench("isDeepEqual", () => {
      isDeepEqual(a, b);
    });

    bench("deep object comparison (baseline)", () => {
      const recursible = (o: any, x: any) => {
        if (typeof o === "object" && typeof x === "object") {
          const keys = [...Object.keys(o), ...Object.keys(x)];
          for (const key of keys) {
            if (!recursible(o[key], x[key])) {
              return false;
            }
          }
          return true;
        } else {
          return o === x;
        }
      };
      recursible(a, b);
    });
  });

  describe("flattenWithGroups", () => {
    bench("flattenWithGroups", () => {
      flattenWithGroups(NESTED_ARRAY);
    });
    bench("Array.flat (baseline)", () => {
      NESTED_ARRAY.flat(1);
    });
  });

  describe("reLayerGroups", () => {
    bench("reLayerGroups", () => {
      reLayerGroups(FLAT_NESTED);
    });

    bench("re-layer a nested array (baseline)", () => {
      const out = [];
      let lastGroup = [];
      for (let idx = 0; idx < FLAT_NESTED.length; idx += 1) {
        const e = FLAT_NESTED[idx];
        if (e === START_GROUP_DIVIDER) {
          lastGroup = [];
        } else if (e === END_GROUP_DIVIDER) {
          out.push(lastGroup!);
          lastGroup = [];
        } else {
          lastGroup.push(e);
        }
      }
    });
  });

  describe("applyLogicToFlattenedGroups", () => {
    bench("applyLogicToFlattenedGroups (some)", () => {
      applyLogicToFlattenedGroups(
        FLAT_NESTED,
        ["some", "some"],
        (x) => x === 5,
      );
    });
    bench("Array.some (baseline)", () => {
      NESTED_ARRAY.some((group) => group.some((x) => x === 5));
    });
  });
});
