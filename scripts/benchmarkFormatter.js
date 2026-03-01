import fs from "fs/promises";

const CYAN = "\x1b[0;36m";
const GREEN = "\x1b[0;32m";
const YELLOW = "\x1b[1;33m";
const RED = "\x1b[0;31m";
const BOLD = "\x1b[1m";
const NC = "\x1b[0m";

const main = async () => {
  const data = await processStdInToJson();
  formatReport(data);
};

const processStdInToJson = async () => {
  const file = await fs.readFile("benchmark.json");
  return JSON.parse(file);
};

const subjective = (ratio) => {
  if (ratio < 1.5) return [CYAN, "Optimized"];
  if (ratio < 5) return [GREEN, "Performant"];
  if (ratio < 10) return [YELLOW, "Within target"];
  return [RED, "Exceeds target"];
};

const fmtHz = (hz) => {
  if (hz >= 1_000_000) return (hz / 1_000_000).toFixed(2) + "M ops/s";
  if (hz >= 1_000) return (hz / 1_000).toFixed(2) + "K ops/s";
  return hz.toFixed(2) + " ops/s";
};

const formatReport = (data) => {
  for (const file of data.files) {
    for (const group of file.groups) {
      const label = group.fullName.replace(/^.*> /, "");
      console.log(`\n${BOLD}${label}${NC}`);

      const benches = group.benchmarks;

      for (const bench of benches) {
        if (bench.name.endsWith("(baseline)")) {
          console.log(
            `  ${bench.name.padEnd(50)} ${fmtHz(bench.hz).padEnd(16)} [baseline]${NC}`,
          );
          continue;
        }

        const baseline = getBaselineForBenchmark(data, bench.id);
        if (!baseline) {
          continue;
        }

        const ratio = baseline.hz / bench.hz;
        const [color, analysis] = subjective(ratio);
        const ratioStr = `${analysis} (${ratio < 1 ? (1 / ratio).toFixed(2) : ratio.toFixed(2)}${
          ratio < 1 ? "x faster" : "x slower"
        })`;
        console.log(
          `  ${bench.name.padEnd(50)} ${fmtHz(bench.hz).padEnd(16)} ${color}${BOLD}${ratioStr}${NC}`,
        );
      }
    }
  }
  console.log("");
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

await main();
