/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, expect, it } from "vitest";
import type { NestedPartial } from "./_types";
import {
  applyLogicToFlattenedGroups,
  arrayToMap,
  bucketMultikeyArray,
  bucketsToMap,
  END_GROUP_DIVIDER,
  flattenWithGroups,
  getKeys,
  isDeepEqual,
  isEqual,
  isMatch,
  reLayerGroups,
  START_GROUP_DIVIDER,
} from "./utils";

describe("utils", () => {
  describe("getKeys", () => {
    it("can retrieve keys for an object", () => {
      expect(getKeys({ a: 1, b: 2, c: 3 })).to.eql(["a", "b", "c"]);
    });

    it("casts the keys as keys of T", () => {
      const obj = { a: 1, b: 2, c: 3 };
      // uncomment the below to see how an error shows when the types do not
      // match
      // ----
      // const untypedKeys: (keyof typeof obj)[] = Object.keys(obj)
      const keys: (keyof typeof obj)[] = getKeys(obj);
      expect(keys).to.be.ok;
    });

    it("fails gracefully when the elem provided isn't an object", () => {
      expect(getKeys(7 as any)).to.eql([]);
    });
    it("fails gracefully when the elem provided is undefined", () => {
      expect(getKeys(undefined as any)).to.eql([]);
    });
    it("fails gracefully when the elem provided is null", () => {
      expect(getKeys(null as any)).to.eql([]);
    });
  });

  describe("arrayToMap", () => {
    it("can convert an array to a map", () => {
      expect(arrayToMap(["a", "b", "c"], (e) => e)).to.eql({
        a: "a",
        b: "b",
        c: "c",
      });
    });

    it("can use any valid map key type for the key", () => {
      const array = [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
        { id: 3, name: "c" },
      ];

      expect(arrayToMap(array, (e) => e.id)).to.eql({
        1: array[0],
        2: array[1],
        3: array[2],
      });
    });

    it("can transform a value in the map", () => {
      const array = [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
        { id: 3, name: "c" },
      ];

      expect(
        arrayToMap(
          array,
          (e) => e.id,
          (e) => e.name,
        ),
      ).to.eql({
        1: "a",
        2: "b",
        3: "c",
      });
    });

    it("returns null when an array is not provided", () => {
      expect(
        arrayToMap(
          undefined as unknown as Array<unknown>,
          (e: unknown) => e as string,
        ),
      ).to.be.null;
    });
  });

  describe("bucketMultiKeyArray", () => {
    it("can bucket on a single key per elem", () => {
      const array = [
        { id: 1, name: "a", type: "animal" },
        { id: 2, name: "b", type: "vehicle" },
        { id: 3, name: "c", type: "animal" },
      ];

      expect(bucketMultikeyArray(array, (e) => [e.type])).to.eql([
        { key: "animal", value: [array[0], array[2]] },
        { key: "vehicle", value: [array[1]] },
      ]);
    });

    it("can bucket on multiple keys per elem", () => {
      const array = [
        { id: 1, name: "a", type: "animal" },
        { id: 2, name: "b", type: "vehicle" },
        { id: 3, name: "c", type: "animal" },
      ];

      expect(bucketMultikeyArray(array, (e) => [e.name.length, e.type])).to.eql(
        [
          { key: "1", value: [...array] },
          { key: "animal", value: [array[0], array[2]] },
          { key: "vehicle", value: [array[1]] },
        ],
      );
    });

    it("does not attempt to bucket when an array is not provided", () => {
      expect(
        bucketMultikeyArray(undefined as any, (e: any) => [
          e.name.length,
          e.type,
        ]),
      ).to.be.null;
    });
  });

  describe("bucketsToMap", () => {
    it("can convert a set of buckets into the map equivalent", () => {
      const array = [
        { id: 1, name: "a", type: "animal" },
        { id: 2, name: "b", type: "vehicle" },
        { id: 3, name: "c", type: "animal" },
      ];
      const buckets = bucketMultikeyArray(array, (e) => [e.type]);

      expect(bucketsToMap(buckets!)).to.eql({
        animal: [array[0], array[2]],
        vehicle: [array[1]],
      });
    });

    it("clobbers duplicate buckets", () => {
      const array = [
        { id: 1, name: "a", type: "animal" },
        { id: 2, name: "b", type: "vehicle" },
        { id: 3, name: "c", type: "animal" },
      ];
      const buckets = [
        ...bucketMultikeyArray(array, (e) => [e.type])!,
        { key: "vehicle", value: [] },
      ];

      expect(bucketsToMap(buckets)).to.eql({
        animal: [array[0], array[2]],
        vehicle: [],
      });
    });

    it("returns null when an array is not provided", () => {
      expect(bucketsToMap(undefined as any)).to.be.null;
    });
  });

  describe("isEqual", () => {
    const testCases = [
      ["string", "a", "a", "b"],
      ["numeric", 1, 1, 0],
      ["boolean", false, false, true],
      ["symbol", Symbol("*"), Symbol("*"), Symbol("#")],
      [
        "object",
        { a: 1, b: { c: 2 } },
        { a: 1, b: { c: 2 } }, // order does matter in most browsers
        { a: 1, d: { c: 2 } },
      ],
      ["null", null, null, undefined],
      ["undefined", undefined, undefined, null],
      ["array", ["a", "b", "c"], ["a", "b", "c"], ["a", "d", "c"]],
      [
        "array of objects",
        [{ name: "a" }, { age: 99 }, { type: "pet" }],
        [{ name: "a" }, { age: 99 }, { type: "pet" }],
        [{ name: "a" }, { age: 100 }, { name: "pet" }],
      ],
    ] as [string, any, any, any][];
    describe.each(testCases)(
      "%s equality",
      (_, root, matching, notMatching) => {
        it("can detect when the values are equal", () => {
          expect(isEqual(root, matching)).to.be.true;
        });

        it("can detect when the values are not equal", () => {
          expect(isEqual(root, notMatching)).to.be.false;
        });
      },
    );
  });

  describe("isMatch", () => {
    it("can detect that one object is a match for another full object", () => {
      expect(isMatch({ a: 1, b: { c: 1 } }, { a: 1, b: { c: 1 } })).to.be.true;
    });

    it("can detect that one object is a match for a partial object", () => {
      expect(isMatch({ b: { c: 1 }, a: 1 }, { a: 1 })).to.be.true;
    });

    it("can compare arrays of objects when the order of elems match", () => {
      // to get to an index other than the first, you will need to set the
      // appropriate index without populating any of the other indices
      const comparison = Array(2);
      comparison[1] = { b: 2 };

      expect(isMatch([{ a: 1 }, { b: 2 }], comparison)).to.be.true;
    });

    it("can detect that one object is a match for a deeply nested partial object", () => {
      expect(isMatch({ b: { c: 1, d: 2 }, a: 1 }, { b: { c: 1 } })).to.be.true;
    });

    it("can detect that one object is not a match for another full object", () => {
      expect(
        isMatch<any>({ a: 1, b: { c: 1 } }, {
          a: 1,
          d: { c: 1 },
        } as unknown as NestedPartial<any>),
      ).to.be.false;
    });

    it("can detect that one object is not a match for another when comparing deeply", () => {
      expect(isMatch({ a: 1, b: { c: 1, d: 2 } }, { b: { c: 2 } })).to.be.false;
    });

    it("returns true when the partial is an empty object", () => {
      expect(isMatch({ a: 1, b: 2 }, {})).to.be.true;
    });

    it("returns false when arrays have the same elements in different positions", () => {
      expect(isMatch(["a", "b"], ["b", "a"])).to.be.false;
    });
  });

  describe("isDeepEqual", () => {
    it("can detect when primitives are equal", () => {
      expect(isDeepEqual(7, 7)).to.be.true;
      expect(isDeepEqual("abc", "abc")).to.be.true;
      expect(isDeepEqual(false, false)).to.be.true;
    });

    it("can detect when primitives are not equal", () => {
      expect(isDeepEqual(7, 7.1)).to.be.false;
      expect(isDeepEqual("abc", "abcd")).to.be.false;
      expect(isDeepEqual(false, true)).to.be.false;
    });

    it("can detect that one object is a match for another full object", () => {
      expect(isDeepEqual({ a: 1, b: { c: 1 } }, { a: 1, b: { c: 1 } })).to.be
        .true;
    });

    it("can detect that one object is not deeply equal to a partial object", () => {
      expect(isDeepEqual({ b: { c: 1 }, a: 1 }, { a: 1 })).to.be.false;
    });

    it("can compare arrays of objects deeply", () => {
      expect(isDeepEqual([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 2 }])).to.be
        .true;
    });

    it("can detect that one object is not a match for a deeply nested partial object", () => {
      expect(isDeepEqual({ b: { c: 1, d: 2 }, a: 1 }, { b: { c: 1 } })).to.be
        .false;
    });

    it("can detect that one object is not a match for another full object", () => {
      expect(
        isDeepEqual<any>({ a: 1, b: { c: 1 } }, {
          a: 1,
          d: { c: 1 },
        } as unknown as NestedPartial<any>),
      ).to.be.false;
    });

    it("can detect that one object is not a match for another when comparing deeply", () => {
      expect(isDeepEqual({ a: 1, b: { c: 1, d: 2 } }, { b: { c: 2 } })).to.be
        .false;
    });

    it("returns true for objects with the same keys and values in different insertion order", () => {
      expect(isDeepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).to.be.true;
    });

    it("returns false for arrays with the same elements in different positions", () => {
      expect(isDeepEqual(["a", "b"], ["b", "a"])).to.be.false;
    });
  });

  describe("flattenWithGroups", () => {
    it("can return an un-nested array as is", () => {
      expect(flattenWithGroups(["a", "b"])).to.eql(["a", "b"]);
    });

    it("can separate nested arrays into groups", () => {
      expect(flattenWithGroups([["a", "b"], ["c"]])).to.eql([
        START_GROUP_DIVIDER,
        "a",
        "b",
        END_GROUP_DIVIDER,
        START_GROUP_DIVIDER,
        "c",
        END_GROUP_DIVIDER,
      ]);
    });

    it("can separate multiply-nested arrays into groups", () => {
      const root = [
        [["a", "b"], ["c"]],
        [["d"], ["e", "f"]],
      ];

      const firstFlatten = flattenWithGroups(root);
      const secondFlatten = flattenWithGroups(firstFlatten);

      expect(secondFlatten).to.eql([
        START_GROUP_DIVIDER,
        START_GROUP_DIVIDER,
        "a",
        "b",
        END_GROUP_DIVIDER,
        START_GROUP_DIVIDER,
        "c",
        END_GROUP_DIVIDER,
        END_GROUP_DIVIDER,
        START_GROUP_DIVIDER,
        START_GROUP_DIVIDER,
        "d",
        END_GROUP_DIVIDER,
        START_GROUP_DIVIDER,
        "e",
        "f",
        END_GROUP_DIVIDER,
        END_GROUP_DIVIDER,
      ]);
    });

    it("can flatten a complex, unevenly layered group", () => {
      const complexArray = [
        [{ name: "d" }, { name: "e", hobbies: ["games"] }],
        [[[{ name: "f" }, { name: "g" }]]],
        [
          [
            { name: "a", hobbies: ["sports"] },
            { name: "b", hobbies: ["hiking"] },
          ],
          [{ name: "c", hobbies: [] }],
          [{ name: "d", hobbies: ["nothing"] }],
        ],
      ];

      const flattenedOnce = flattenWithGroups(complexArray);
      expect(flattenedOnce).to.eql([
        START_GROUP_DIVIDER,
        { name: "d" },
        { name: "e", hobbies: ["games"] },
        END_GROUP_DIVIDER,
        START_GROUP_DIVIDER,
        [[{ name: "f" }, { name: "g" }]],
        END_GROUP_DIVIDER,
        START_GROUP_DIVIDER,
        [
          { name: "a", hobbies: ["sports"] },
          { name: "b", hobbies: ["hiking"] },
        ],
        [{ name: "c", hobbies: [] }],
        [{ name: "d", hobbies: ["nothing"] }],
        END_GROUP_DIVIDER,
      ]);

      const flattenedTwice = flattenWithGroups(flattenedOnce);
      expect(flattenedTwice).to.eql([
        START_GROUP_DIVIDER,
        { name: "d" },
        { name: "e", hobbies: ["games"] },
        END_GROUP_DIVIDER,
        START_GROUP_DIVIDER,
        START_GROUP_DIVIDER,
        [{ name: "f" }, { name: "g" }],
        END_GROUP_DIVIDER,
        END_GROUP_DIVIDER,
        START_GROUP_DIVIDER,
        START_GROUP_DIVIDER,
        { name: "a", hobbies: ["sports"] },
        { name: "b", hobbies: ["hiking"] },
        END_GROUP_DIVIDER,
        START_GROUP_DIVIDER,
        { name: "c", hobbies: [] },
        END_GROUP_DIVIDER,
        START_GROUP_DIVIDER,
        { name: "d", hobbies: ["nothing"] },
        END_GROUP_DIVIDER,
        END_GROUP_DIVIDER,
      ]);

      const flattenedThrice = flattenWithGroups(flattenedTwice);
      expect(flattenedThrice).to.eql([
        START_GROUP_DIVIDER,
        { name: "d" },
        { name: "e", hobbies: ["games"] },
        END_GROUP_DIVIDER,
        START_GROUP_DIVIDER,
        START_GROUP_DIVIDER,
        START_GROUP_DIVIDER,
        { name: "f" },
        { name: "g" },
        END_GROUP_DIVIDER,
        END_GROUP_DIVIDER,
        END_GROUP_DIVIDER,
        START_GROUP_DIVIDER,
        START_GROUP_DIVIDER,
        { name: "a", hobbies: ["sports"] },
        { name: "b", hobbies: ["hiking"] },
        END_GROUP_DIVIDER,
        START_GROUP_DIVIDER,
        { name: "c", hobbies: [] },
        END_GROUP_DIVIDER,
        START_GROUP_DIVIDER,
        { name: "d", hobbies: ["nothing"] },
        END_GROUP_DIVIDER,
        END_GROUP_DIVIDER,
      ]);
    });

    it("can fail gracefully when the array provided is undefined", () => {
      expect(flattenWithGroups(undefined as any)).to.be.undefined;
    });

    it("can fail gracefully when the array provided is null", () => {
      expect(flattenWithGroups(null as any)).to.be.null;
    });
  });

  describe("reLayerGroups", () => {
    it("returns an empty array when given an empty array", () => {
      expect(reLayerGroups([])).to.eql([]);
    });

    it("does not affect an un-layered array", () => {
      const arr = ["a", "b", "c"];

      expect(reLayerGroups(arr)).to.eql(["a", "b", "c"]);
    });
    it("can re-layer a singly-nested arrays", () => {
      const arr = [
        START_GROUP_DIVIDER,
        "a",
        "b",
        END_GROUP_DIVIDER,
        START_GROUP_DIVIDER,
        "c",
        END_GROUP_DIVIDER,
      ];

      expect(reLayerGroups(arr)).to.eql([["a", "b"], ["c"]]);
    });

    it("can re-layer a multiply-nested arrays", () => {
      const arr = [
        START_GROUP_DIVIDER,
        START_GROUP_DIVIDER,
        "a",
        "b",
        END_GROUP_DIVIDER,
        START_GROUP_DIVIDER,
        "c",
        END_GROUP_DIVIDER,
        END_GROUP_DIVIDER,
        START_GROUP_DIVIDER,
        START_GROUP_DIVIDER,
        "d",
        END_GROUP_DIVIDER,
        START_GROUP_DIVIDER,
        "e",
        "f",
        END_GROUP_DIVIDER,
        END_GROUP_DIVIDER,
      ];

      expect(reLayerGroups(arr)).to.eql([
        [["a", "b"], ["c"]],
        [["d"], ["e", "f"]],
      ]);
    });

    it("can re-layer an array that its sibling function, flattenWithGroups, broke up", () => {
      const complexArray = [
        [{ name: "d" }, { name: "e", hobbies: ["games"] }],
        [[[{ name: "f" }, { name: "g" }]]],
        [
          [
            { name: "a", hobbies: ["sports"] },
            { name: "b", hobbies: ["hiking"] },
          ],
          [{ name: "c", hobbies: [] }],
          [{ name: "d", hobbies: ["nothing"] }],
        ],
      ];

      const flattenedOnce = flattenWithGroups(complexArray);
      expect(reLayerGroups(flattenedOnce)).to.eql(complexArray);

      const flattenedTwice = flattenWithGroups(flattenedOnce);
      expect(reLayerGroups(flattenedTwice)).to.eql(complexArray);

      const flattenedThrice = flattenWithGroups(flattenedTwice);
      expect(reLayerGroups(flattenedThrice)).to.eql(complexArray);
    });
  });

  describe("applyLogicToFlattenedGroups", () => {
    it("can apply a single layer of array logic to a singly-layered (unflattened) array", () => {
      const arr = [{ id: "1" }, { id: "2" }, { id: "3" }];
      expect(applyLogicToFlattenedGroups(arr, ["some"], (x) => x.id == "2")).to
        .be.true;
    });

    it("can apply a single layer of array logic to a doubly-layered (flattened) array", () => {
      const arr = [[{ id: "1" }, { id: "2" }], [{ id: "3" }]];
      const flatArr = flattenWithGroups(arr);
      expect(
        applyLogicToFlattenedGroups(
          flatArr,
          ["some", "some"],
          (x) => x.id == "2",
        ),
      ).to.be.true;
    });

    it("can apply a single layer of array logic to a triply-layered (twice-flattened) array", () => {
      const arr = [[[{ id: "1" }], [{ id: "2" }]], [[{ id: "3" }]]];
      const flatArr = flattenWithGroups(arr);
      const doublyFlatArr = flattenWithGroups(flatArr);
      expect(
        applyLogicToFlattenedGroups(
          doublyFlatArr,
          ["some", "some", "some"],
          (x) => x.id == "2",
        ),
      ).to.be.true;
    });

    it("throws an error if there are not enough logics passed to resolve", () => {
      const arr = [[{ id: "1" }, { id: "2" }], [{ id: "3" }]];
      const flatArr = flattenWithGroups(arr);
      expect(() =>
        applyLogicToFlattenedGroups(flatArr, ["some"], (x) => x.id == "2"),
      ).to.throw();
    });

    it("can alternate logics", () => {
      const data = [[["lion", "tiger"]], [["bear"], ["zebra", "lion"]]];
      const flatArr = flattenWithGroups(data);
      const doublyFlatArr = flattenWithGroups(flatArr);

      expect(
        applyLogicToFlattenedGroups(
          doublyFlatArr,
          ["every", "every", "every"],
          (x) => ["lion", "bear"].includes(x),
        ),
      ).to.be.false;

      expect(
        applyLogicToFlattenedGroups(
          doublyFlatArr,
          ["some", "some", "some"],
          (x) => ["lion", "bear"].includes(x),
        ),
      ).to.be.true;

      expect(
        applyLogicToFlattenedGroups(
          doublyFlatArr,
          ["some", "every", "every"],
          (x) => ["lion", "bear"].includes(x),
        ),
      ).to.be.false;

      expect(
        applyLogicToFlattenedGroups(
          doublyFlatArr,
          ["some", "every", "some"],
          (x) => ["lion", "bear"].includes(x),
        ),
      ).to.be.true;

      expect(
        applyLogicToFlattenedGroups(
          doublyFlatArr,
          ["some", "some", "every"],
          (x) => ["lion", "bear"].includes(x),
        ),
      ).to.be.true;

      expect(
        applyLogicToFlattenedGroups(
          doublyFlatArr,
          ["every", "some", "some"],
          (x) => ["lion", "bear"].includes(x),
        ),
      ).to.be.true;

      expect(
        applyLogicToFlattenedGroups(
          doublyFlatArr,
          ["every", "some", "every"],
          (x) => ["lion", "bear"].includes(x),
        ),
      ).to.be.false;

      expect(
        applyLogicToFlattenedGroups(
          doublyFlatArr,
          ["every", "every", "some"],
          (x) => ["lion", "bear"].includes(x),
        ),
      ).to.be.true;
    });

    it("returns false when given an empty array", () => {
      expect(applyLogicToFlattenedGroups([], ["some"], () => true)).to.be.false;
    });

    it("requires that any given group have at least one value to return true", () => {
      const arr = [[{ id: "1" }, { id: "2" }], []];
      const flatArr = flattenWithGroups(arr);
      expect(
        applyLogicToFlattenedGroups(
          flatArr,
          ["every", "some"],
          (x) => x.id == "2",
        ),
      ).to.be.false;
    });
  });
});
