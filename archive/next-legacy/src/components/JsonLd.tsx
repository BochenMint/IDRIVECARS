/**
 * Renderuje dane strukturalne schema.org jako <script type="application/ld+json">.
 * Bezpiecznie escape'uje znak `<`, by uniknąć przedwczesnego zamknięcia tagu.
 */
type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

export function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
