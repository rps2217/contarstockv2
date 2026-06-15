/**
 * Legacy test exports for UnitTestsCard compatibility
 * @deprecated Use Vitest tests in tests/ directory instead
 */
import { TestResult } from './uiLogic.test';

export const runAggregatorTests = (): TestResult[] => {
  return [
    { name: 'Legacy - use Vitest instead', passed: true }
  ];
};