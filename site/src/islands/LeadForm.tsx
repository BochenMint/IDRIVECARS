import { useState, FormEvent } from 'react';
import PartnerDisclosure from './PartnerDisclosure';

export type LeadFormProps = {
  unlocked: boolean;
  model: string;
  price?: number;
  leadgenUrl?: string;
  consentText?: string;
};

export default function LeadForm({
  unlocked,
  model,
  price,
  leadgenUrl = 'http://localhost:8000',
  consentText = 'Wyrażam zgodę na przetwarzanie moich danych osobowych w celu kontaktu w sprawie oferty.',
}: LeadFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nip, setNip] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  if (!unlocked) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!consent) return;
    setStatus('loading');
    try {
      const res = await fetch(`${leadgenUrl}/webhook/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          nip: nip || undefined,
          model,
          price,
          source: 'leasing_calc',
        }),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-stone-50 p-5">
      <h3 className="font-display text-lg text-[#171717]">Zostaw kontakt — oddzwonimy</h3>
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
      <label className="block text-sm">
        <span className="font-medium">NIP (opcjonalnie)</span>
        <input
          type="text"
          value={nip}
          onChange={(e) => setNip(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        />
      </label>
      <input type="hidden" name="model" value={model} />
      {price != null && <input type="hidden" name="price" value={price} />}
      <label className="flex items-start gap-2 text-sm text-[#737373]">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1"
        />
        <span>{consentText}</span>
      </label>
      <button
        type="submit"
        disabled={status === 'loading'}
        className="rounded-full bg-[#171717] px-6 py-3 text-sm font-semibold text-white hover:bg-[#b91c1c] disabled:opacity-50"
      >
        {status === 'loading' ? 'Wysyłanie…' : 'Wyślij zapytanie'}
      </button>
      {status === 'success' && <p className="text-sm text-green-700">Dziękujemy! Skontaktujemy się wkrótce.</p>}
      {status === 'error' && <p className="text-sm text-[#b91c1c]">Błąd wysyłki. Spróbuj ponownie.</p>}
    </form>
  );
}
