import { describe, it, expect } from "vitest";
import { QueryArray } from "./queryArray";

describe("performance on small arrays (<100 elems)", () => {
  const sample = new Array(99).fill({ id: Math.floor(Math.random() * 10) });

  it("can perform a query at around the same time as a native filter", () => {
    const startFilterTime = new Date();
    const filterResult = sample.filter((s) => s.id === 5);
    const filterDelta = +new Date() - +startFilterTime;

    const startQueryTime = new Date();
    const queryResult = new QueryArray(sample).where("id").is(5);
    const queryDelta = +new Date() - +startQueryTime;

    expect(queryDelta).to.be.closeTo(filterDelta, 2);
    expect(queryResult).to.eql(filterResult);
  });
});

describe.skip("performance on medium arrays (1000 - 10k elems)", () => {
  const sample = new Array(9999).fill({ id: Math.floor(Math.random() * 10) });

  it("can perform a query at around the same time as a native filter", () => {
    const startFilterTime = new Date();
    const filterResult = sample.filter((s) => s.id === 5);
    const filterDelta = +new Date() - +startFilterTime;

    const startQueryTime = new Date();
    const queryResult = new QueryArray(sample).where("id").is(5);
    const queryDelta = +new Date() - +startQueryTime;

    expect(queryDelta).to.be.closeTo(filterDelta, 100);
    expect(queryResult).to.eql(filterResult);
  });
});

describe.skip("performance on large arrays (> 10k elems)", () => {
  const sample = new Array(999999).fill({ id: Math.floor(Math.random() * 10) });
  const startCreate = new Date();
  const qa = new QueryArray(sample);

  it("can perform a query at around the same time as a native filter", () => {
    const startFilterTime = new Date();
    const filterResult = sample.map((s) => s.id).filter((x) => x === 5);
    const filterDelta = +new Date() - +startFilterTime;

    const startQueryTime = new Date();
    const step1 = qa.where("id");
    const step2Start = new Date();
    const queryResult = step1.is(5);
    const queryDelta = +new Date() - +startQueryTime;

    expect(queryDelta).to.be.closeTo(filterDelta, 50);
    expect(queryResult).to.eql(filterResult);
  });
});
