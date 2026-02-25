import { describe, it, expect, vi } from "vitest";
import { QueryArray } from "./queryArray";
import { isNumber, isString } from "./typeChecks";

describe("query array", () => {
  it("can create a query array from an array", () => {
    expect(new QueryArray(["a", "b", "c"])).to.be.instanceOf(Array);
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
          .via("linkedId")
          .whichReferences("id")
          .storedTo("linked"),
      ).to.eql([{ id: "t1", linkedId: "u1", linked: uData[0] }]);
    });

    it("can perform a join between two arrays via an array of IDs", () => {
      const tData = [{ id: "t1", linkedIds: ["u1", "u3"] }];
      const uData = [{ id: "u1" }, { id: "u2" }, { id: "u3" }];
      expect(
        new QueryArray(tData)
          .joinWith(uData)
          .via("linkedIds")
          .whichReferences("id")
          .storedTo("linked"),
      ).to.eql([
        { id: "t1", linkedIds: ["u1", "u3"], linked: [uData[0], uData[2]] },
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
        .via("linkedIds")
        .whichReferences("id")
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
        expect(
          new QueryArray(data)
            .where((x) => x)
            .not()
            .is("b"),
        ).to.eql(["a", "c"]);
      });

      it("can exclude within only one logical part of the query", () => {
        const data = [{ id: "a" }, { id: "b" }, { id: "c" }];
        expect(
          new QueryArray(data)
            .where("id")
            .not()
            .is("b")
            .and.where("id")
            .greaterThan("b"),
        ).to.eql([{ id: "c" }]);
      });

      it("can exclude on both logical parts of the query", () => {
        const data = [{ id: "a" }, { id: "b" }, { id: "c" }];
        expect(
          new QueryArray(data)
            .where("id")
            .not()
            .is("b")
            .and.where("id")
            .not()
            .is("c"),
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
          { id: "b", role: { id: "r2", name: "Backpacker" } },
          { id: "c", role: { id: "r1", name: "Artist" } },
        ];

        expect(
          new QueryArray(data)
            .where("id")
            .is("c")
            .and.where("role")
            .its("name")
            .is("Artist"),
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
              ["r1", "Artist"],
              ["r2", "Backpacker"],
            ],
          },
          {
            id: "b",
            roles: [
              ["r2", "Backpacker"],
              ["r3", "Musician"],
            ],
          },
          { id: "c", roles: [["r1", "Artist"]] },
        ];

        expect(
          new QueryArray(data).where("roles").some().some().is("Artist"),
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

        const qa = new QueryArray(data)
          .where("roles")
          .every("role")
          .some("role identifier");
        expect(
          new QueryArray(data)
            .where("roles")
            .every("role")
            .some("role identifier")
            .is("Artist"),
        ).to.eql([data[2]]);
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
});
