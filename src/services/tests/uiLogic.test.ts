/**
 * Legacy test exports for UnitTestsCard compatibility
 * These are placeholder functions that return empty test results.
 * The actual tests are now in tests/ directory and use Vitest.
 */
export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export interface TestGroup {
  title: string;
  tests: TestResult[];
}

/**
 * @deprecated Use Vitest tests in tests/ directory instead
 */
export const runUiLogicTests = (): TestResult[] => {
  return [
    { name: 'Legacy - use Vitest instead', passed: true }
  ];
};

/**
 * @deprecated Use Vitest tests in tests/ directory instead
 */
export const runScannerMachineTests = (): TestResult[] => {
  return [
    { name: 'Legacy - use Vitest instead', passed: true }
  ];
};

/**
 * @deprecated Use Vitest tests in tests/ directory instead
 */
export const runAggregatorTests = (): TestResult[] => {
  return [
    { name: 'Legacy - use Vitest instead', passed: true }
  ];
};