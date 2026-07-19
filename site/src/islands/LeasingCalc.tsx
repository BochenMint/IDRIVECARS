import { useState, useCallback } from 'react';
import { calculateInstallments, formatPlnOrientacyjnie } from '../lib/finance';
import LeadForm from './LeadForm';
import InsuranceCalc from './InsuranceCalc';
import PartnerDisclosure from './PartnerDisclosure';

export type LeasingCalcProps = {
  netPrice: number;
  downPaymentPct?: number;
  termMonths?: number;
  residualValuePct?: number;
  annualRate?: number;
  model: string;
  brand: string;
  partnerMode?: 'redirect' | 'form';
  affiliateUrl?: string;
  affiliatePartnerName?: string;
  leadgenUrl?: string;
  consentText?: string;
  subid?: string;
  ofwcaActive?: boolean;
};

export default function LeasingCalc({
  netPrice,
  downPaymentPct = 10,
  termMonths = 36,
  residualValuePct = 30,
  annualRate = 0.055,
  model,
  brand,
  partnerMode = 'redirect',
  affiliateUrl = 'https://partner.example.com/leasing',
  affiliatePartnerName = 'Partner leasingowy',
  leadgenUrl = 'http://localhost:8000',
  consentText,
  subid = 'calc',
  ofwcaActive = false,
}: LeasingCalcProps) {
  const [price, setPrice] = useState(netPrice);
  const [down, setDown] = useState(downPaymentPct);
  const [term, setTerm] = useState(termMonths);
  const [rv, setRv] = useState(residualValuePct);
  const [rate, setRate] = useState(annualRate * 100);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof calculateInstallments> | null>(null);

  const handleCalculate = useCallback(() => {
    const calc = calculateInstallments({
      netPrice: price,
      downPaymentPct: down,
      termMonths: term,
      residualValuePct: rv,
      annualRate: rate / 100,
    });
    setResult(calc);
    setHasCalculated(true);
  }, [price, down, term, rv, rate]);

  const affiliateHref = `${affiliateUrl}?subid=${encodeURIComponent(subid)}&model=${encodeURIComponent(`${brand} ${model}`)}`;

  return (
    <section className="my-10 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm" aria-labelledby="leasing-calc-title">
      <h2 id="leasing-calc-title" className="font-display text-2xl text-[#171717]">
        Kalkulator leasingu i wynajmu
      </h2>
      <p className="mt-2 text-sm text-[#737373]">
        Szacunkowe raty netto — wartości orientacyjne, nie stanowią oferty handlowej.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-[#171717]">Cena netto (PLN)</span>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
            min={0}
            step={1000}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-[#171717]">Wpłata własna (%)</span>
          <input
            type="number"
            value={down}
            onChange={(e) => setDown(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
            min={0}
            max={100}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-[#171717]">Okres (miesiące)</span>
          <input
            type="number"
            value={term}
            onChange={(e) => setTerm(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
            min={12}
            max={60}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-[#171717]">Wartość wykupu (%)</span>
          <input
            type="number"
            value={rv}
            onChange={(e) => setRv(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
            min={0}
            max={70}
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-[#171717]">Oprocentowanie roczne (%)</span>
          <input
            type="number"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
            min={0}
            max={30}
            step={0.1}
          />
        </label>
      </div>

      <button
        type="button"
        onClick={handleCalculate}
        className="mt-6 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700"
      >
        Oblicz ratę
      </button>

      {hasCalculated && result && (
        <div className="mt-8 space-y-4 border-t border-neutral-200 pt-6">
          <p className="text-lg font-semibold text-[#171717]">
            Leasing: {formatPlnOrientacyjnie(result.leaseNetMonthly)}
          </p>
          <p className="text-lg font-semibold text-[#171717]">
            Wynajem: {formatPlnOrientacyjnie(result.rentNetMonthly)}
          </p>

          {partnerMode === 'redirect' ? (
            <div>
              <a
                href={affiliateHref}
                rel="sponsored noopener noreferrer"
                target="_blank"
                className="inline-block rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white no-underline transition hover:bg-neutral-700"
              >
                Sprawdź ofertę u partnera
              </a>
              <PartnerDisclosure partnerName={affiliatePartnerName} />
            </div>
          ) : (
            <LeadForm
              unlocked={hasCalculated}
              model={`${brand} ${model}`}
              price={price}
              leadgenUrl={leadgenUrl}
              consentText={consentText}
            />
          )}

          <InsuranceCalc
            model={`${brand} ${model}`}
            brand={brand}
            leadgenUrl={leadgenUrl}
            ofwcaActive={ofwcaActive}
            afterLease={hasCalculated}
            newCar={false}
          />
        </div>
      )}
    </section>
  );
}
