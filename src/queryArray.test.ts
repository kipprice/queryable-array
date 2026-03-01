import { describe, it, expect, vi } from "vitest";
import { QueryArray } from "./queryArray";
import { isNumber, isString } from "./typeChecks";

describe("query array", () => {
  it("can create a query array from an array", () => {
    expect(new QueryArray(["a", "b", "c"])).to.be.instanceOf(Array);
  });

  it("instantiates local instances as regular arrays rather than QueryArrays", () => {
    const qa = new QueryArray(["a", "b", "c"]);
    expect(QueryArray[Symbol.species]).to.not.eql(QueryArray);
  });

  it("can return the same data that was passed in", () => {
    expect(new QueryArray(["a", "b", "c"])).to.eql(["a", "b", "c"]);
  });

  it("can create a query array ", () => {
    expect(new QueryArray(["a", "b", "c"])).to.eql(["a", "b", "c"]);
  });

  describe("properties", () => {
    it("can grab the first element of an array", () => {
      expect(new QueryArray(["a", "b", "c"]).first).to.eq("a");
    });

    it("can grab the last element of an array", () => {
      expect(new QueryArray(["a", "b", "c"]).last).to.eq("c");
    });
  });

  describe("unique", () => {
    it("can remove duplicates from the array", () => {
      const data = [{ id: "a" }, { id: "b" }, { id: "a" }];
      expect(new QueryArray(data).unique()).to.eql([{ id: "a" }, { id: "b" }]);
    });
  });

  describe("uniqueBy", () => {
    it("can remove duplicates from the array based on a key", () => {
      const data = [{ id: "a" }, { id: "b" }, { id: "a" }];
      expect(new QueryArray(data).uniqueBy("id")).to.eql([
        { id: "a" },
        { id: "b" },
      ]);
    });

    it("can remove duplicates from the array based on a function", () => {
      const data = [{ id: "a" }, { id: "b" }, { id: "a" }];
      expect(new QueryArray(data).uniqueBy((t) => t.id)).to.eql([
        { id: "a" },
        { id: "b" },
      ]);
    });

    it("uses object-friendly equality when determining uniqueness", () => {
      const data = [{ id: "a" }, { id: "b" }, { id: "a" }];
      expect(new QueryArray(data).uniqueBy((t) => t)).to.eql([
        { id: "a" },
        { id: "b" },
      ]);
    });

    it("can perform further filters on the returned unique ", () => {
      const data = [{ id: "a" }, { id: "b" }, { id: "a" }];
      expect(
        new QueryArray(data)
          .uniqueBy((t) => t)
          .where("id")
          .is("a"),
      ).to.eql([{ id: "a" }]);
    });
  });

  describe("sort", () => {
    it("can sort a query array by function (ascending by default)", () => {
      expect(new QueryArray(["c", "a", "b"]).sortBy((v) => v)).to.eql([
        "a",
        "b",
        "c",
      ]);
    });

    it("can sort a query array by function (descending)", () => {
      expect(new QueryArray(["c", "a", "b"]).sortBy((v) => v, "desc")).to.eql([
        "c",
        "b",
        "a",
      ]);
    });

    it("can sort a query array that has multiple of the same value", () => {
      expect(new QueryArray(["b", "a", "a"]).sortBy((v) => v, "asc")).to.eql([
        "a",
        "a",
        "b",
      ]);
    });

    it("can sort a query array by key (ascending by default)", () => {
      expect(
        new QueryArray([{ id: 2 }, { id: 3 }, { id: 1 }]).sortBy("id"),
      ).to.eql([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });

    it("can sort a query array by function (descending)", () => {
      const data = [{ id: 2 }, { id: 3 }, { id: 1 }];
      expect(new QueryArray(data).sortBy("id", "desc")).to.eql([
        { id: 3 },
        { id: 2 },
        { id: 1 },
      ]);
    });

    it("can sort an empty array", () => {
      expect(new QueryArray<{ id: string }>([]).sortBy("id")).to.eql([]);
    });

    it("can apply filters to the array after sorting", () => {
      const data = [{ id: 2 }, { id: 3 }, { id: 1 }];
      expect(new QueryArray(data).sortBy("id").where("id").lte(2)).to.eql([
        { id: 1 },
        { id: 2 },
      ]);
    });
  });

  describe("join", () => {
    it("can perform a join between two arrays via a single id field", () => {
      const tData = [{ id: "t1", linkedId: "u1" }];
      const uData = [{ id: "u1" }];
      expect(
        new QueryArray(tData)
          .joinWith(uData)
          .whereMy("linkedId")
          .referencesTheir("id")
          .storedTo("linked"),
      ).to.eql([{ id: "t1", linkedId: "u1", linked: uData[0] }]);
    });

    it("can perform a join between two arrays via function getters on both sides", () => {
      const tData = [{ id: "t1", linkedId: "u1" }];
      const uData = [{ id: "u1" }];
      expect(
        new QueryArray(tData)
          .joinWith(uData)
          .whereMy((t) => t.linkedId)
          .referencesTheir((u) => u.id)
          .storedTo("linked"),
      ).to.eql([{ id: "t1", linkedId: "u1", linked: uData[0] }]);
    });

    it("can perform a join between two arrays via an array of IDs", () => {
      const tData = [{ id: "t1", linkedIds: ["u1", "u3"] }];
      const uData = [{ id: "u1" }, { id: "u2" }, { id: "u3" }];
      expect(
        new QueryArray(tData)
          .joinWith(uData)
          .whereMy("linkedIds")
          .referencesTheir("id")
          .storedTo("linked"),
      ).to.eql([
        { id: "t1", linkedIds: ["u1", "u3"], linked: [uData[0], uData[2]] },
      ]);
    });

    it("by default includes only valid references", () => {
      const tData = [{ id: "t1", linkedIds: ["u1", "u3"] }];
      const uData = [{ id: "u1" }, { id: "u2" }];
      expect(
        new QueryArray(tData)
          .joinWith(uData)
          .whereMy("linkedIds")
          .referencesTheir("id")
          .storedTo("linked"),
      ).to.eql([{ id: "t1", linkedIds: ["u1", "u3"], linked: [uData[0]] }]);
    });

    it("can optionally retain undefined when a reference is not found", () => {
      const tData = [{ id: "t1", linkedIds: ["u1", "u3"] }];
      const uData = [{ id: "u1" }, { id: "u2" }];
      expect(
        new QueryArray(tData)
          .joinWith(uData)
          .whereMy("linkedIds")
          .referencesTheir("id")
          .storedTo("linked", { keepUndefinedReferences: true }),
      ).to.eql([
        { id: "t1", linkedIds: ["u1", "u3"], linked: [uData[0], undefined] },
      ]);
    });

    it("can perform further queries on the new version of a joined array", () => {
      const tData = [
        { id: "t1", linkedIds: ["u1", "u3"] },
        { id: "t2", linkedIds: ["u2"] },
      ];
      const uData = [{ id: "u1" }, { id: "u2" }, { id: "u3" }];

      const qa = new QueryArray(tData)
        .joinWith(uData)
        .whereMy("linkedIds")
        .referencesTheir("id")
        .storedTo("linked");

      expect(qa.where("linked").some().its("id").is("u2")).to.eql([
        { id: "t2", linkedIds: ["u2"], linked: [uData[1]] },
      ]);
    });
  });

  describe("indexBy", () => {
    it("can return the data in a map instead of an array", () => {
      const data = [{ id: "data" }];
      expect(new QueryArray(data).indexBy("id")).to.eql({
        data: { id: "data" },
      });
    });

    it("can transform the query array into a uniquely-indexed map via a prop name", () => {
      const data = [{ id: 2 }, { id: 3 }, { id: 1 }];
      expect(new QueryArray(data).indexBy("id")).to.eql({
        1: { id: 1 },
        2: { id: 2 },
        3: { id: 3 },
      });
    });

    it("can transform the query array into a uniquely-indexed map via a function", () => {
      const data = [{ id: 2 }, { id: 3 }, { id: 1 }];
      expect(new QueryArray(data).indexBy((d) => d.id + 2)).to.eql({
        3: { id: 1 },
        4: { id: 2 },
        5: { id: 3 },
      });
    });

    it("gracefully handles indexing when the array is empty", () => {
      expect(new QueryArray<{ id: string }>([]).indexBy("id")).to.eql({});
    });
  });

  describe("groupBy", () => {
    it("can return groups of data by a property key", () => {
      expect(
        new QueryArray([{ a: 1 }, { a: 2 }, { a: 1 }]).groupBy("a"),
      ).to.eql({
        1: [{ a: 1 }, { a: 1 }],
        2: [{ a: 2 }],
      });
    });

    it("can return groups of data via a bucket fn", () => {
      expect(
        new QueryArray([{ a: 1 }, { a: 2 }, { a: 1 }]).groupBy((v) =>
          v.a.toString(),
        ),
      ).to.eql({
        1: [{ a: 1 }, { a: 1 }],
        2: [{ a: 2 }],
      });
    });

    it("can return groups of data via a multikey bucket fn", () => {
      expect(
        new QueryArray([{ a: 1 }, { a: 2 }, { a: 1 }]).groupBy((v) => [
          v.a.toString(),
        ]),
      ).to.eql({
        1: [{ a: 1 }, { a: 1 }],
        2: [{ a: 2 }],
      });
    });

    it("gracefully handles grouping when the array is empty", () => {
      expect(new QueryArray<{ id: string }>([]).groupBy("id")).to.eql({});
    });
  });

  describe("extract", () => {
    it("can extract an array of sub-properties via a property", () => {
      const data = [{ id: "a" }, { id: "b" }, { id: "c" }];
      expect(new QueryArray(data).extract("id")).to.eql(["a", "b", "c"]);
    });

    it("can extract an array of sub-properties via a function", () => {
      const data = [{ id: "a" }, { id: "b" }, { id: "c" }];
      expect(new QueryArray(data).extract((t) => t.id)).to.eql(["a", "b", "c"]);
    });

    it("automatically flattens the results of the sub-array", () => {
      const data = [
        { id: "a", hobbies: ["running", "skateboarding"] },
        { id: "b" },
        { id: "c", hobbies: ["origami", "running"] },
      ];
      expect(new QueryArray(data).extract("hobbies")).to.eql([
        "running",
        "skateboarding",
        "origami",
        "running",
      ]);
    });

    it("can perform a unique filter onto the returned results", () => {
      const data = [
        { id: "a", hobbies: ["running", "skateboarding"] },
        { id: "b", hobbies: [] },
        { id: "c", hobbies: ["origami", "running"] },
      ];
      expect(new QueryArray(data).extract("hobbies").unique()).to.eql([
        "running",
        "skateboarding",
        "origami",
      ]);
    });

    it("can perform further filtering on the flattened results", () => {
      const data = [{ id: "a" }, { id: "b" }, { id: "c" }];
      expect(
        new QueryArray(data)
          .extract("id")
          .where((t) => t)
          .is("b"),
      ).to.eql(["b"]);
    });

    it("can perform further filtering on the flattened returned results", () => {
      const data = [
        {
          id: "a",
          hobbies: [
            { id: "h1", name: "running" },
            { id: "h2", name: "skateboarding" },
          ],
        },
        { id: "b", hobbies: [] },
        {
          id: "c",
          hobbies: [
            { id: "h3", name: "origami" },
            { id: "h1", name: "running" },
          ],
        },
      ];
      const qa = new QueryArray(data).extract("hobbies");

      expect(
        new QueryArray(data).extract("hobbies").where("id").is("h1"),
      ).to.eql([
        { id: "h1", name: "running" },
        { id: "h1", name: "running" },
      ]);
    });
  });

  describe("where", () => {
    it("can filter by a simple key-based 'where' clause", () => {
      const data = [{ id: 2 }, { id: 3 }, { id: 1 }];
      expect(new QueryArray(data).where("id").greaterThan(1)).to.eql([
        { id: 2 },
        { id: 3 },
      ]);
    });

    it("can filter by a function-based 'where' clause", () => {
      const data = [{ id: 2 }, { id: 3 }, { id: 1 }];
      expect(new QueryArray(data).where((t) => t.id.toString()).is("1")).to.eql(
        [{ id: 1 }],
      );
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
          new QueryArray(data)
            .where("a")
            .is(1)
            .or.where("b")
            .its("c")
            .is("abc"),
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

  describe("and", () => {
    it("can apply and logic to the query array", () => {
      const data = [{ id: 2 }, { id: 3 }, { id: 1 }];
      expect(
        new QueryArray(data)
          .where("id")
          .greaterThan(1)
          .and.where("id")
          .lessThan(3),
      ).to.eql([{ id: 2 }]);
    });

    it("can chain multiple ands together", () => {
      const data = [
        { id: 2, name: "a" },
        { id: 3, name: "b" },
        { id: 1, name: "c" },
        { id: 2, name: "d" },
      ];
      expect(
        new QueryArray(data)
          .where("id")
          .greaterThan(1)
          .and.where("id")
          .lessThan(3)
          .and.where("name")
          .is("d"),
      ).to.eql([{ id: 2, name: "d" }]);
    });

    it("can chain 'and' and 'or' logic", () => {
      const data = [{ id: 2 }, { id: 3 }, { id: 1 }];
      expect(
        new QueryArray(data)
          .where("id")
          .satisfies((id) => isNumber(id))
          .and.where("id")
          .lessThan(2)
          .or.where("id")
          .greaterThan(2),
      ).to.eql([{ id: 3 }, { id: 1 }]);
    });
  });

  describe("or", () => {
    it("can apply or logic to the query array", () => {
      const data = [{ id: 2 }, { id: 3 }, { id: 1 }];
      expect(
        new QueryArray(data)
          .where("id")
          .lte(1)
          .or.where("id")
          .greaterThanOrEqualTo(3),
      ).to.eql([{ id: 3 }, { id: 1 }]);
    });

    it("can chain multiple 'or's together", () => {
      const data = [{ id: 2 }, { id: 3 }, { id: 1 }];
      expect(
        new QueryArray(data)
          .where("id")
          .satisfies((id) => false)
          .or.where("id")
          .lessThan(2)
          .or.where("id")
          .greaterThan(2),
      ).to.eql([{ id: 3 }, { id: 1 }]);
    });

    it("does not include duplicates when or-ing", () => {
      const data = [{ id: 2 }, { id: 3 }, { id: 1 }];
      expect(
        new QueryArray(data).where("id").lte(2).or.where("id").is(1),
      ).to.eql([{ id: 2 }, { id: 1 }]);
    });

    it("preserves a sort order when applying 'or' logic", () => {
      const data = [{ id: 2 }, { id: 3 }, { id: 1 }];
      expect(
        new QueryArray(data)
          .sortBy("id")
          .where("id")
          .lte(1)
          .or.where("id")
          .greaterThanOrEqualTo(3),
      ).to.eql([{ id: 1 }, { id: 3 }]);
    });
  });

  describe("native array methods", () => {
    const data = [
      { id: 1, name: "alpha" },
      { id: 2, name: "beta" },
      { id: 3, name: "gamma" },
    ];

    describe("map", () => {
      it("returns the same result as Array.map", () => {
        const qa = new QueryArray(data);
        expect(qa.map((t) => t.id)).to.eql(data.map((t) => t.id));
      });

      it("passes index and array to the callback", () => {
        const qa = new QueryArray(data);
        const indices: number[] = [];
        qa.map((_, idx) => {
          indices.push(idx);
          return idx;
        });
        expect(indices).to.eql([0, 1, 2]);
      });

      it("returns a QueryArray instance", () => {
        expect(new QueryArray(data).map((t) => t.id)).to.be.instanceOf(
          QueryArray,
        );
      });
    });

    describe("filter", () => {
      it("returns the same result as Array.filter", () => {
        const qa = new QueryArray(data);
        expect(qa.filter((t) => t.id > 1)).to.eql(data.filter((t) => t.id > 1));
      });

      it("returns a QueryArray instance", () => {
        expect(new QueryArray(data).filter((t) => t.id > 1)).to.be.instanceOf(
          QueryArray,
        );
      });
    });

    describe("concat", () => {
      it("returns the same result as Array.concat", () => {
        const extra = [{ id: 4, name: "delta" }];
        const qa = new QueryArray(data);
        expect(qa.concat(extra)).to.eql(data.concat(extra));
      });

      it("returns a QueryArray instance", () => {
        const extra = [{ id: 4, name: "delta" }];
        const qa = new QueryArray(data);
        expect(qa.concat(extra)).to.be.instanceOf(QueryArray);
      });
    });

    describe("slice", () => {
      it("returns the same result as Array.slice with start", () => {
        const qa = new QueryArray(data);
        expect(qa.slice(1)).to.eql(data.slice(1));
      });

      it("returns the same result as Array.slice with start and end", () => {
        const qa = new QueryArray(data);
        expect(qa.slice(0, 2)).to.eql(data.slice(0, 2));
      });

      it("returns a QueryArray instance", () => {
        expect(new QueryArray(data).slice(2)).to.be.instanceOf(QueryArray);
      });
    });

    describe("flat", () => {
      it("returns the same result as Array.flat", () => {
        const nested = new QueryArray([[1, 2], [3]]);
        expect(nested.flat()).to.eql([[1, 2], [3]].flat());
      });

      it("returns a QueryArray instance", () => {
        const nested = new QueryArray([[1, 2], [3]]);
        expect(nested.flat()).to.be.instanceOf(QueryArray);
      });
    });

    describe("flatMap", () => {
      it("returns the same result as Array.flatMap", () => {
        const qa = new QueryArray(data);
        expect(qa.flatMap((t) => [t.id, t.id * 10])).to.eql(
          data.flatMap((t) => [t.id, t.id * 10]),
        );
      });

      it("returns a QueryArray instance", () => {
        const nested = new QueryArray(data);
        expect(nested.flatMap((t) => [t.id, t.id * 10])).to.be.instanceOf(
          QueryArray,
        );
      });
    });

    describe("with", () => {
      it("returns the same result as Array.with", () => {
        const qa = new QueryArray(data);
        const replacement = { id: 99, name: "zeta" };
        expect(qa.with(1, replacement)).to.eql(data.with(1, replacement));
      });

      it("returns a QueryArray instance", () => {
        const qa = new QueryArray(data);
        const replacement = { id: 99, name: "zeta" };
        expect(qa.with(1, replacement)).to.be.instanceOf(QueryArray);
      });
    });

    describe("toSorted", () => {
      it("returns the same result as Array.toSorted", () => {
        const qa = new QueryArray(data);
        const compareFn = (a: (typeof data)[0], b: (typeof data)[0]) =>
          b.id - a.id;
        expect(qa.toSorted(compareFn)).to.eql(data.toSorted(compareFn));
      });

      it("does not mutate the original array", () => {
        const qa = new QueryArray([...data]);
        qa.toSorted((a, b) => b.id - a.id);
        expect(qa).to.eql(data);
        expect(qa.data).to.eql(data);
      });

      it("returns a QueryArray instance", () => {
        const qa = new QueryArray([...data]);
        expect(qa.toSorted((a, b) => b.id - a.id)).to.be.instanceOf(QueryArray);
      });
    });

    describe("toReversed", () => {
      it("returns the same result as Array.toReversed", () => {
        const qa = new QueryArray(data);
        expect(qa.toReversed()).to.eql(data.toReversed());
      });

      it("does not mutate the original array", () => {
        const qa = new QueryArray(data);
        qa.toReversed();
        expect(qa).to.eql(data);
        expect(qa.data).to.eql(data);
      });

      it("returns a QueryArray instance", () => {
        const qa = new QueryArray(data);
        expect(qa.toReversed()).to.be.instanceOf(QueryArray);
      });
    });

    describe("toSpliced", () => {
      it("returns the same result as Array.toSpliced", () => {
        const qa = new QueryArray(data);
        const newItem = { id: 99, name: "zeta" };
        expect(qa.toSpliced(1, 1, newItem)).to.eql(
          data.toSpliced(1, 1, newItem),
        );
      });

      it("does not mutate the original array", () => {
        const qa = new QueryArray(data);
        qa.toSpliced(1, 1);
        expect(qa).to.eql(data);
        expect(qa.data).to.eql(data);
      });

      it("returns a QueryArray instance", () => {
        const qa = new QueryArray(data);
        expect(qa.toSpliced(1)).to.be.instanceOf(QueryArray);
      });
    });

    describe("fill", () => {
      it("returns the same result as Array.fill", () => {
        const arr = [1, 2, 3, 4];
        const qa = new QueryArray([...arr]);
        expect(qa.fill(0, 1, 3)).to.eql([...arr].fill(0, 1, 3));
      });

      it("mutates in place", () => {
        const qa = new QueryArray([1, 2, 3]);
        qa.fill(0);
        expect(qa).to.eql([0, 0, 0]);
      });

      it("returns a QueryArray instance", () => {
        const qa = new QueryArray([1, 2, 3, 4]);
        expect(qa.fill(0)).to.be.instanceOf(QueryArray);
      });
    });

    describe("sort", () => {
      it("returns the same result as Array.sort", () => {
        const arr = [3, 1, 2];
        const qa = new QueryArray([...arr]);
        expect(qa.sort((a, b) => a - b)).to.eql([...arr].sort((a, b) => a - b));
      });

      it("mutates in place", () => {
        const qa = new QueryArray([3, 1, 2]);
        qa.sort((a, b) => a - b);
        expect(qa).to.eql([1, 2, 3]);
        expect(qa.data).to.eql([1, 2, 3]);
      });

      it("returns a QueryArray instance", () => {
        const qa = new QueryArray([3, 1, 2]);
        expect(qa.sort()).to.be.instanceOf(QueryArray);
      });
    });

    describe("reverse", () => {
      it("returns the same result as Array.reverse", () => {
        const arr = [1, 2, 3];
        const qa = new QueryArray([...arr]);
        expect(qa.reverse()).to.eql([...arr].reverse());
      });

      it("mutates in place", () => {
        const qa = new QueryArray([1, 2, 3]);
        qa.reverse();
        expect(qa).to.eql([3, 2, 1]);
        expect(qa.data).to.eql([3, 2, 1]);
      });

      it("returns a QueryArray instance", () => {
        const qa = new QueryArray([3, 1, 2]);
        expect(qa.reverse()).to.be.instanceOf(QueryArray);
      });
    });

    describe("splice", () => {
      it("returns the removed elements like Array.splice", () => {
        const arr = [1, 2, 3, 4];
        const qa = new QueryArray([...arr]);
        expect(qa.splice(1, 2)).to.eql([...arr].splice(1, 2));
      });

      it("mutates in place", () => {
        const qa = new QueryArray([1, 2, 3, 4]);
        qa.splice(1, 2);
        expect(qa).to.eql([1, 4]);
        expect(qa.data).to.eql([1, 4]);
      });

      it("returns a QueryArray instance", () => {
        const qa = new QueryArray([1, 2, 3, 4]);
        expect(qa.splice(1, 1)).to.be.instanceOf(QueryArray);
      });
    });

    describe("copyWithin", () => {
      it("returns the same result as Array.copyWithin", () => {
        const arr = [1, 2, 3, 4, 5];
        const qa = new QueryArray([...arr]);
        expect(qa.copyWithin(0, 3)).to.eql([...arr].copyWithin(0, 3));
      });

      it("mutates in place", () => {
        const qa = new QueryArray([1, 2, 3, 4, 5]);
        qa.copyWithin(0, 3);
        expect(qa).to.eql([4, 5, 3, 4, 5]);
        expect(qa.data).to.eql([4, 5, 3, 4, 5]);
      });

      it("returns a QueryArray instance", () => {
        const qa = new QueryArray([1, 2, 3, 4, 5]);
        expect(qa.copyWithin(0, 3)).to.be.instanceOf(QueryArray);
      });
    });

    describe("includes", () => {
      it("returns the same result as Array.includes", () => {
        const arr = [1, 2, 3];
        const qa = new QueryArray(arr);
        expect(qa.includes(2)).to.eql(arr.includes(2));
        expect(qa.includes(9)).to.eql(arr.includes(9));
      });
    });

    describe("find", () => {
      it("returns the same result as Array.find", () => {
        const qa = new QueryArray(data);
        expect(qa.find((t) => t.id === 2)).to.eql(data.find((t) => t.id === 2));
      });

      it("returns undefined when not found", () => {
        const qa = new QueryArray(data);
        expect(qa.find((t) => t.id === 99)).to.be.undefined;
      });
    });

    describe("findIndex", () => {
      it("returns the same result as Array.findIndex", () => {
        const qa = new QueryArray(data);
        expect(qa.findIndex((t) => t.id === 2)).to.eql(
          data.findIndex((t) => t.id === 2),
        );
      });

      it("returns -1 when not found", () => {
        const qa = new QueryArray(data);
        expect(qa.findIndex((t) => t.id === 99)).to.eq(-1);
      });
    });

    describe("findLast", () => {
      it("returns the same result as Array.findLast", () => {
        const arr = [1, 2, 3, 2, 1];
        const qa = new QueryArray(arr);
        expect(qa.findLast((t) => t === 2)).to.eql(
          arr.findLast((t) => t === 2),
        );
      });
    });

    describe("findLastIndex", () => {
      it("returns the same result as Array.findLastIndex", () => {
        const arr = [1, 2, 3, 2, 1];
        const qa = new QueryArray(arr);
        expect(qa.findLastIndex((t) => t === 2)).to.eql(
          arr.findLastIndex((t) => t === 2),
        );
      });
    });

    describe("indexOf", () => {
      it("returns the same result as Array.indexOf", () => {
        const arr = [1, 2, 3];
        const qa = new QueryArray(arr);
        expect(qa.indexOf(2)).to.eql(arr.indexOf(2));
        expect(qa.indexOf(9)).to.eql(arr.indexOf(9));
      });
    });

    describe("lastIndexOf", () => {
      it("returns the same result as Array.lastIndexOf", () => {
        const arr = [1, 2, 1, 3];
        const qa = new QueryArray(arr);
        expect(qa.lastIndexOf(1)).to.eql(arr.lastIndexOf(1));
      });
    });

    describe("forEach", () => {
      it("visits the same elements as Array.forEach", () => {
        const qa = new QueryArray(data);
        const arrVisited: number[] = [];
        data.forEach((t) => arrVisited.push(t.id));
        const qaVisited: number[] = [];
        qa.forEach((t) => qaVisited.push(t.id));
        expect(qaVisited).to.eql(arrVisited);
      });
    });

    describe("every", () => {
      it("returns the same result as Array.every", () => {
        const qa = new QueryArray(data);
        expect(qa.every((t) => t.id > 0)).to.eql(data.every((t) => t.id > 0));
        expect(qa.every((t) => t.id > 1)).to.eql(data.every((t) => t.id > 1));
      });
    });

    describe("some", () => {
      it("returns the same result as Array.some", () => {
        const qa = new QueryArray(data);
        expect(qa.some((t) => t.id === 2)).to.eql(data.some((t) => t.id === 2));
        expect(qa.some((t) => t.id === 99)).to.eql(
          data.some((t) => t.id === 99),
        );
      });
    });

    describe("reduce", () => {
      it("returns the same result as Array.reduce", () => {
        const qa = new QueryArray(data);
        expect(qa.reduce((acc, t) => acc + t.id, 0)).to.eql(
          data.reduce((acc, t) => acc + t.id, 0),
        );
      });
    });

    describe("reduceRight", () => {
      it("returns the same result as Array.reduceRight", () => {
        const arr = [1, 2, 3];
        const qa = new QueryArray(arr);
        expect(qa.reduceRight((acc, t) => acc + t, 0)).to.eql(
          arr.reduceRight((acc, t) => acc + t, 0),
        );
      });
    });

    describe("pop", () => {
      it("returns the last element like Array.pop", () => {
        const qa = new QueryArray([1, 2, 3]);
        expect(qa.pop()).to.eq(3);
      });

      it("mutates in place", () => {
        const qa = new QueryArray([1, 2, 3]);
        qa.pop();
        expect(qa).to.eql([1, 2]);
        expect(qa.data).to.eql([1, 2]);
      });
    });

    describe("shift", () => {
      it("returns the first element like Array.shift", () => {
        const qa = new QueryArray([1, 2, 3]);
        expect(qa.shift()).to.eq(1);
      });

      it("mutates in place", () => {
        const qa = new QueryArray([1, 2, 3]);
        qa.shift();
        expect(qa).to.eql([2, 3]);
        expect(qa.data).to.eql([2, 3]);
      });
    });

    describe("push", () => {
      it("returns the new length like Array.push", () => {
        const qa = new QueryArray([1, 2, 3]);
        expect(qa.push(4)).to.eq(4);
      });

      it("mutates in place", () => {
        const qa = new QueryArray([1, 2, 3]);
        qa.push(4);
        expect(qa).to.eql([1, 2, 3, 4]);
        expect(qa.data).to.eql([1, 2, 3, 4]);
      });
    });

    describe("unshift", () => {
      it("returns the new length like Array.unshift", () => {
        const qa = new QueryArray([1, 2, 3]);
        expect(qa.unshift(0)).to.eq(4);
      });

      it("mutates in place", () => {
        const qa = new QueryArray([1, 2, 3]);
        qa.unshift(0);
        expect(qa).to.eql([0, 1, 2, 3]);
        expect(qa.data).to.eql([0, 1, 2, 3]);
      });
    });

    describe("at", () => {
      it("returns the same result as Array.at", () => {
        const qa = new QueryArray(data);
        expect(qa.at(0)).to.eql(data.at(0));
        expect(qa.at(-1)).to.eql(data.at(-1));
      });
    });

    describe("entries", () => {
      it("returns the same entries as Array.entries", () => {
        const qa = new QueryArray(data);
        expect([...qa.entries()]).to.eql([...data.entries()]);
      });
    });

    describe("values", () => {
      it("returns the same values as Array.values", () => {
        const qa = new QueryArray(data);
        expect([...qa.values()]).to.eql([...data.values()]);
      });
    });

    describe("keys", () => {
      it("returns the same keys as Array.keys", () => {
        const qa = new QueryArray(data);
        expect([...qa.keys()]).to.eql([...data.keys()]);
      });
    });

    describe("join", () => {
      it("returns the same result as Array.join", () => {
        const arr = ["a", "b", "c"];
        const qa = new QueryArray(arr);
        expect(qa.join(", ")).to.eql(arr.join(", "));
      });

      it("uses the default separator like Array.join", () => {
        const arr = ["a", "b", "c"];
        const qa = new QueryArray(arr);
        expect(qa.join()).to.eql(arr.join());
      });
    });

    describe("toString", () => {
      it("returns the same result as Array.toString", () => {
        const arr = [1, 2, 3];
        const qa = new QueryArray(arr);
        expect(qa.toString()).to.eql(arr.toString());
      });
    });

    describe("toLocaleString", () => {
      it("returns the same result as Array.toLocaleString with no args", () => {
        const arr = [1, 2, 3];
        const qa = new QueryArray(arr);
        expect(qa.toLocaleString()).to.eql(arr.toLocaleString());
      });

      it("returns the same result as Array.toLocaleString with locale args", () => {
        const arr = [1, 2, 3];
        const qa = new QueryArray(arr);
        expect(qa.toLocaleString("fr")).to.eql(arr.toLocaleString("fr"));
      });

      it("returns the same result as Array.toLocaleString with locale args", () => {
        const arr = [1, 2, 3];
        const qa = new QueryArray(arr);
        expect(qa.toLocaleString("fr", { compactDisplay: "short" })).to.eql(
          arr.toLocaleString("fr", { compactDisplay: "short" }),
        );
      });
    });
  });
});
