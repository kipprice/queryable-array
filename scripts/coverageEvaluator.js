import fs from "fs/promises";

const main = async () => {
  const data = await processCoverageFile();
  hasFullCoverage(data);
};

const processCoverageFile = async () => {
  const file = await fs.readFile("coverage/coverage-summary.json");
  return JSON.parse(file);
};

const hasFullCoverage = (coverageReport) => {
  for (const key of ["lines", "statements", "functions", "branches"]) {
    const { pct } = coverageReport.total[key];
    if (pct !== 100) {
      throw new Error("not 100% covered");
    }
  }
  console.log("100% coverage!");
};

main();
