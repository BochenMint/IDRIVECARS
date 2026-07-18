type PartnerDisclosureProps = {
  partnerName?: string;
  text?: string;
};

export default function PartnerDisclosure({
  partnerName,
  text = 'Materiał zawiera linki partnerskie. idrivecars.pl może otrzymać wynagrodzenie od partnera przy skorzystaniu z oferty — zgodnie z wymogami UOKiK.',
}: PartnerDisclosureProps) {
  return (
    <aside className="mt-4 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-[#737373]">
      {partnerName && <strong className="text-[#171717]">{partnerName} — </strong>}
      {text}
    </aside>
  );
}
