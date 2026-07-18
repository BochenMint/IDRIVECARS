import { describe, expect, it } from 'vitest';
import { calculateInstallments, formatPlnOrientacyjnie } from './finance';

describe('calculateInstallments', () => {
  it('computes lease payment for standard case (150k, 10% down, 36m, 30% RV, 5.5%)', () => {
    const result = calculateInstallments({
      netPrice: 150_000,
      downPaymentPct: 10,
      termMonths: 36,
      residualValuePct: 30,
      annualRate: 0.055,
    });

    expect(result.residualValue).toBe(45_000);
    expect(result.financedAmount).toBe(90_000);
    // PMT ≈ 2717.63 PLN netto/mies.
    expect(result.leaseNetMonthly).toBeCloseTo(2717.63, 0);
    expect(result.rentNetMonthly).toBeGreaterThan(result.leaseNetMonthly);
    expect(result.rentNetMonthly).toBeCloseTo(2774, 0);
  });

  it('handles 0% down payment', () => {
    const result = calculateInstallments({
      netPrice: 100_000,
      downPaymentPct: 0,
      termMonths: 48,
      residualValuePct: 20,
      annualRate: 0.06,
    });

    expect(result.financedAmount).toBe(80_000);
    expect(result.leaseNetMonthly).toBeGreaterThan(0);
  });

  it('handles high residual value (low financed amount)', () => {
    const result = calculateInstallments({
      netPrice: 200_000,
      downPaymentPct: 20,
      termMonths: 24,
      residualValuePct: 55,
      annualRate: 0.05,
    });

    expect(result.financedAmount).toBe(50_000);
    expect(result.leaseNetMonthly).toBeGreaterThan(0);
    expect(result.leaseNetMonthly).toBeLessThan(2500);
  });

  it('returns zero payment when financed amount is zero or negative', () => {
    const result = calculateInstallments({
      netPrice: 50_000,
      downPaymentPct: 50,
      termMonths: 36,
      residualValuePct: 60,
      annualRate: 0.055,
    });

    expect(result.financedAmount).toBeLessThanOrEqual(0);
    expect(result.leaseNetMonthly).toBe(0);
    expect(result.rentNetMonthly).toBe(0);
  });
});

describe('formatPlnOrientacyjnie', () => {
  it('formats with orientacyjnie disclaimer', () => {
    expect(formatPlnOrientacyjnie(2683.47)).toMatch(/orientacyjnie/);
    expect(formatPlnOrientacyjnie(2683.47)).toMatch(/2\s?683/);
    expect(formatPlnOrientacyjnie(2683.47)).toMatch(/netto\/mies/);
  });
});
