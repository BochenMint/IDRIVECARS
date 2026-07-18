import { useState, FormEvent } from 'react';
import PartnerDisclosure from './PartnerDisclosure';

export type InsuranceCalcProps = {
  model: string;
  brand: string;
  leadgenUrl?: string;
  ofwcaActive?: boolean;
  newCar?: boolean;
  afterLease?: boolean;
  affiliateUrl?: string;
  affiliatePartnerName?: string;
};

export default function InsuranceCalc({
  model,
  brand,
  leadgenUrl = 'http://localhost:8000',
  ofwcaActive = false,
  newCar = false,
  afterLease = false,
  affiliateUrl = 'https://partner.example.com/insurance',
  affiliatePartnerName = 'Porównywarka ubezpieczeń',
}: InsuranceCalcProps) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const usePathB = ofwcaActive && (newCar || afterLease);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch(`${leadgenUrl}/webhook/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          model,
          funnel: 'insurance_b',
          source: 'insurance_calc',
        }),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  }

  if (!expanded) {
    return (
      <div className="mt-8 border-t border-stone-200 pt-6">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-sm font-semibold text-[#b91c1c] hover:underline"
        >
          A ubezpieczenie tego modelu? →
        </button>
      </div>
    );
  }

  return (
    <section className="mt-8 border-t border-stone-200 pt-6" aria-labelledby="insurance-calc-title">
      <h3 id="insurance-calc-title" className="font-display text-xl text-[#171717]">
        Ubezpieczenie {brand} {model.replace(brand, '').trim()}
      </h3>

      {usePathB ? (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-sm text-[#737373]">
            Jako licencjonowany pośrednik (OFWCA) przygotujemy indywidualną wycenę ubezpieczenia.
          </p>
          <label className="block text-sm">
            <span className="font-medium">Imię i nazwisko</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Telefon</span>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <input type="hidden" name="model" value={model} />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="rounded-full bg-[#171717] px-6 py-3 text-sm font-semibold text-white hover:bg-[#b91c1c]"
          >
            {status === 'loading' ? 'Wysyłanie…' : 'Poproś o wycenę'}
          </button>
          {status === 'success' && <p className="text-sm text-green-700">Zapytanie wysłane.</p>}
          {status === 'error' && <p className="text-sm text-[#b91c1c]">Błąd wysyłki.</p>}
        </form>
      ) : (
        <div className="mt-4">
          <a
            href={`${affiliateUrl}?model=${encodeURIComponent(model)}`}
            rel="sponsored noopener noreferrer"
            target="_blank"
            className="inline-block rounded-full border border-[#171717] px-6 py-3 text-sm font-semibold text-[#171717] hover:bg-[#171717] hover:text-white"
          >
            Porównaj ubezpieczenia u partnera
          </a>
          <PartnerDisclosure partnerName={affiliatePartnerName} />
        </div>
      )}
    </section>
  );
}
