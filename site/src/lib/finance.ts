/**
 * Pure finance calculation helpers for leasing and operational rent estimates.
 *
 * Lease formula (financial lease / leasing operacyjny z wykupem):
 *   financedAmount = netPrice - downPayment - residualValue
 *   monthlyRate    = annualRate / 12
 *   PMT            = financedAmount * monthlyRate / (1 - (1 + monthlyRate)^-termMonths)
 *
 * Rent (wynajem długoterminowy) uses the same principal but a higher effective
 * annual rate (+25%) to reflect service-inclusive pricing typical of rent offers.
 *
 * All amounts are net (PLN netto). Results rounded to 2 decimal places.
 */

export type FinanceInput = {
  /** Net price in PLN */
  netPrice: number;
  /** Down payment percentage 0–100 */
  downPaymentPct: number;
  termMonths: number;
  /** Residual / buyout value as % of net price */
  residualValuePct: number;
  /** Annual interest rate as decimal, e.g. 0.055 for 5.5% */
  annualRate: number;
};

export type FinanceResult = {
  leaseNetMonthly: number;
  rentNetMonthly: number;
  financedAmount: number;
  residualValue: number;
};

const RENT_RATE_MULTIPLIER = 1.25;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Standard annuity payment (PMT) for a fully amortizing loan.
 * Returns 0 when financed amount or term is non-positive.
 */
function annuityPayment(principal: number, annualRate: number, termMonths: number): number {
  if (principal <= 0 || termMonths <= 0) return 0;
  if (annualRate <= 0) return round2(principal / termMonths);

  const r = annualRate / 12;
  const factor = 1 - Math.pow(1 + r, -termMonths);
  if (factor === 0) return 0;
  return round2((principal * r) / factor);
}

export function calculateInstallments(input: FinanceInput): FinanceResult {
  const downPayment = input.netPrice * (input.downPaymentPct / 100);
  const residualValue = round2(input.netPrice * (input.residualValuePct / 100));
  const financedAmount = round2(input.netPrice - downPayment - residualValue);

  const leaseNetMonthly = annuityPayment(financedAmount, input.annualRate, input.termMonths);
  const rentNetMonthly = annuityPayment(
    financedAmount,
    input.annualRate * RENT_RATE_MULTIPLIER,
    input.termMonths,
  );

  return {
    leaseNetMonthly,
    rentNetMonthly,
    financedAmount,
    residualValue,
  };
}

/** Format monthly net rate with mandatory "orientacyjnie" disclaimer. */
export function formatPlnOrientacyjnie(n: number): string {
  const formatted = new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(n));
  return `ok. ${formatted} zł netto/mies. (orientacyjnie)`;
}
