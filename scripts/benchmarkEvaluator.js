import fs from "fs/promises";

const main = async () => {
  const data = await processBenchmarkFile();
  hasSuccessfulBenchmarks(data);
};

const processBenchmarkFile = async () => {
  const file = await fs.readFile("benchmark.json");
  return JSON.parse(file);
};

const hasSuccessfulBenchmarks = (data) => {
  for (const file of data.files) {
    for (const group of file.groups) {
      for (const benchmark of group.benchmarks) {
        const isBaseline = benchmark.name.endsWith("(baseline)");
        if (isBaseline) {
          continue;
        }

        const relevantBaseline = getBaselineForBenchmark(data, benchmark.id);
        if (!relevantBaseline) {
          continue;
        }

        const ratio = relevantBaseline.hz / benchmark.hz;
        if (ratio > 10) {
          throw new Error(
            `benchmark ${benchmark.name} exceeded the target range (${ratio})`,
          );
        }
      }
    }
  }
  console.log("100% of benchmarks within target (< 10x)!");
};

const getBaselineForBenchmark = (allBenchmarks, benchmarkId) => {
  for (const file of allBenchmarks.files) {
    for (const group of file.groups) {
      const bIdx = group.benchmarks.findIndex((b) => b.id === benchmarkId);
      if (bIdx === -1) {
        continue;
      }
      const baseline = group.benchmarks.find((b, idx) =>
        idx <= bIdx ? false : b.name.endsWith("(baseline)"),
      );
      if (baseline) {
        return baseline;
      }
    }
  }
  return null;
};

main();
