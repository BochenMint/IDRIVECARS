## Katalog `content/testy`

Tutaj będą przechowywane pliki z testami samochodów w formacie Markdown/MDX.

Każdy test to osobny plik o nazwie `<slug>.mdx` z frontmatterem:

```md
---
slug: "nissan-ariya-nismo"
title: "Nissan Ariya Nismo – tytuł testu"
brand: "Nissan"
model: "Ariya"
year: 2025
publishedAt: "2025-02-11"
lead: "Krótka zajawka testu."
originalUrl: "https://autogaleria.pl/przykladowy-artykul"
heroImage: "galleries/nissan-ariya-nismo/hero.webp"
galleryDir: "galleries/nissan-ariya-nismo"
tags: ["elektryk", "SUV"]
bodyType: "SUV"
drivetrain: "AWD"
engine: "Elektryczny"
power: "394 KM"
gearbox: "1-biegowa"
---

Treść artykułu w markdown.
```

**Zdjęcia w tekście:** Zdjęcia z galerii (`public/galleries/<slug>/`) są automatycznie wstawiane w treść co kilka akapitów. Pełna galeria pojawia się pod artykułem. Możesz też wstawić zdjęcie ręcznie: `![opis](/galleries/slug/nazwa.webp)`.

