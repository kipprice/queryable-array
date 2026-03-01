import { describe, expect, it } from "vitest";
import { QueryArray } from "./queryArray";
import { isString } from "./typeChecks";

describe("queryable clause (via where)", () => {
  it("can filter by a simple key-based 'where' clause", () => {
    const data = [{ id: 2 }, { id: 3 }, { id: 1 }];
    expect(new QueryArray(data).where("id").greaterThan(1)).to.eql([
      { id: 2 },
      { id: 3 },
    ]);
  });

  it("can filter by a function-based 'where' clause", () => {
    const data = [{ id: 2 }, { id: 3 }, { id: 1 }];
    expect(new QueryArray(data).where((t) => t.id.toString()).is("1")).to.eql([
      { id: 1 },
    ]);
  });

  it("can filter by stringified equality", () => {
    const data = [{ id: 2 }, { id: 3 }, { id: 1 }];
    expect(new QueryArray(data).where((t) => t).is({ id: 2 })).to.eql([
      { id: 2 },
    ]);
  });

  describe("not", () => {
    it("can exclude instead of include based on a simple query", () => {
      const data = ["a", "b", "c"];
      expect(new QueryArray(data).where((x) => x).not.is("b")).to.eql([
        "a",
        "c",
      ]);
    });

    it("can exclude within only one logical part of the query", () => {
      const data = [{ id: "a" }, { id: "b" }, { id: "c" }];
      expect(
        new QueryArray(data)
          .where("id")
          .not.is("b")
          .and.where("id")
          .greaterThan("b"),
      ).to.eql([{ id: "c" }]);
    });

    it("can exclude on both logical parts of the query", () => {
      const data = [{ id: "a" }, { id: "b" }, { id: "c" }];
      expect(
        new QueryArray(data)
          .where("id")
          .not.is("b")
          .and.where("id")
          .not.is("c"),
      ).to.eql([{ id: "a" }]);
    });
  });

  describe("its", () => {
    it("can filter via where in nested objects", () => {
      const data = [
        { id: "a", role: { id: "r1", name: "Artist" } },
        { id: "b", role: { id: "r2", name: "Backpacker" } },
        { id: "c", role: { id: "r3", name: "Artist" } },
      ];

      const qa = new QueryArray(data).where("role");
      expect(
        new QueryArray(data).where("role").its("name").is("Artist"),
      ).to.eql([data[0], data[2]]);
    });

    it("can filter via where in deeply nested objects", () => {
      const data = [
        { id: "a", details: { role: { name: "Artist" } } },
        { id: "b", details: { role: { name: "Backpacker" } } },
        { id: "c", details: { role: { name: "Artist" } } },
      ];

      expect(
        new QueryArray(data)
          .where("details")
          .its("role")
          .its("name")
          .is("Artist"),
      ).to.eql([data[0], data[2]]);
    });

    it("can filter via where in nested objects with and logic", () => {
      const data = [
        { id: "a", role: { id: "r1", name: "Artist" } },
        { id: "c", role: { id: "r2", name: "Backpacker" } },
        { id: "c", role: { id: "r1", name: "Artist" } },
      ];

      expect(
        new QueryArray(data)
          .where("id")
          .is("c")
          .and.where("role")
          .its("id")
          .is("r1"),
      ).to.eql([data[2]]);
    });

    it("can filter via where in nested objects with or logic", () => {
      const data = [
        { id: "a", role: { id: "r1", name: "Artist" } },
        { id: "b", role: { id: "r2", name: "Backpacker" } },
        { id: "c", role: { id: "r1", name: "Artist" } },
      ];

      expect(
        new QueryArray(data)
          .where("id")
          .is("c")
          .or.where("role")
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
        new QueryArray(data).where("roles").some().its("name").is("Artist"),
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
        new QueryArray(data)
          .where("roles")
          .some("role")
          .some("extra arbitrary layer")
          .some("role identifier")
          .is("Artist"),
      ).to.eql([data[0], data[2]]);
    });

    it("can combine 'some' filters via 'and'", () => {
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
        new QueryArray(data)
          .where("roles")
          .some()
          .its("name")
          .is("Artist")
          .and.where("roles")
          .some()
          .its("id")
          .is("r2"),
      ).to.eql([data[0]]);
    });

    it("can combine 'some' filters via 'or'", () => {
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
        new QueryArray(data)
          .where("roles")
          .some()
          .its("name")
          .is("Artist")
          .or.where("roles")
          .some()
          .its("id")
          .is("r2"),
      ).to.eql([data[0], data[1], data[2]]);
    });

    it("can filter objects with highly irregular types", () => {
      type T = { a?: number; b?: { c?: string } };
      const data: T[] = [{ a: 1 }, { b: {} }, { b: { c: "abc" } }];
      expect(
        new QueryArray(data).where("a").is(1).or.where("b").its("c").is("abc"),
      ).to.eql([data[0], data[2]]);
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
        new QueryArray(data).where("roles").every().its("name").is("Artist"),
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
        new QueryArray(data)
          .where("roles")
          .every("role")
          .every("extra arbitrary layer")
          .every("role identifier")
          .satisfies((x) => isString(x) || x < 3),
      ).to.eql([data[0], data[2]]);
    });

    it("can combine 'some' filters via 'and'", () => {
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
        new QueryArray(data)
          .where("roles")
          .every("role")
          .its("name")
          .is("Artist")
          .and.where("roles")
          .every("role")
          .its("id")
          .satisfies((s) => isString(s)),
      ).to.eql([data[2]]);
    });

    it("can combine 'every' filters via 'or'", () => {
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
        new QueryArray(data)
          .where("roles")
          .every("role")
          .its("name")
          .is("Artist")
          .or.where("roles")
          .every("role")
          .its("id")
          .satisfies((s) => s === "r2" || s === "r4"),
      ).to.eql([data[1], data[2]]);
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
        new QueryArray(data)
          .where("roles")
          .every("role")
          .some("role identifier")
          .is("Artist"),
      ).to.eql([data[2]]);

      expect(
        new QueryArray(data)
          .where("roles")
          .some("role")
          .every("role identifier")
          .is("Artist"),
      ).to.eql([]);
    });
  });

  it("gracefully handles querying when the array is empty", () => {
    expect(new QueryArray<{ id: string }>([]).where("id").is("1")).to.eql([]);
  });
});
