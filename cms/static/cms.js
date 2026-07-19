(function () {
  "use strict";

  const editorRoot = document.getElementById("cms-editor");
  if (!editorRoot) return;

  const cfg = window.CMS_EDITOR || {};
  const contentType = cfg.contentType || editorRoot.dataset.contentType;
  let existingSlug = cfg.existingSlug || editorRoot.dataset.existingSlug || "";
  let currentSlug = existingSlug;
  let pendingFiles = [];
  let uploadedPaths = [];

  const els = {
    title: document.getElementById("title"),
    body: document.getElementById("body"),
    brand: document.getElementById("brand"),
    model: document.getElementById("model"),
    year: document.getElementById("year"),
    engine: document.getElementById("engine"),
    power: document.getElementById("power"),
    gearbox: document.getElementById("gearbox"),
    drivetrain: document.getElementById("drivetrain"),
    bodyType: document.getElementById("bodyType"),
    rating: document.getElementById("rating"),
    sourceName: document.getElementById("sourceName"),
    sourceUrl: document.getElementById("sourceUrl"),
    aiAssisted: document.getElementById("aiAssisted"),
    dropzone: document.getElementById("dropzone"),
    fileInput: document.getElementById("file-input"),
    thumbnails: document.getElementById("thumbnails"),
    seoTitle: document.getElementById("seo-title"),
    seoDescription: document.getElementById("seo-description"),
    seoUrl: document.getElementById("seo-url"),
    seoSlug: document.getElementById("seo-slug"),
    btnSave: document.getElementById("btn-save"),
    btnPublish: document.getElementById("btn-publish"),
    status: document.getElementById("cms-status"),
    success: document.getElementById("cms-success"),
  };

  let seoTimer = null;

  function collectPayload() {
    const payload = {
      content_type: contentType,
      existing_slug: existingSlug || null,
      title: els.title?.value || "",
      brand: els.brand?.value || "",
      model: els.model?.value || "",
      body: els.body?.value || "",
    };
    if (els.year?.value) payload.year = parseInt(els.year.value, 10);
    if (els.engine?.value) payload.engine = els.engine.value;
    if (els.power?.value) payload.power = els.power.value;
    if (els.gearbox?.value) payload.gearbox = els.gearbox.value;
    if (els.drivetrain?.value) payload.drivetrain = els.drivetrain.value;
    if (els.bodyType?.value) payload.bodyType = els.bodyType.value;
    if (els.rating?.value) payload.rating = parseFloat(els.rating.value);
    if (els.sourceName?.value) payload.sourceName = els.sourceName.value;
    if (els.sourceUrl?.value) payload.sourceUrl = els.sourceUrl.value;
    if (els.aiAssisted) payload.aiAssisted = els.aiAssisted.checked;
    return payload;
  }

  function updateSeoPreview() {
    clearTimeout(seoTimer);
    seoTimer = setTimeout(async () => {
      const payload = collectPayload();
      try {
        const res = await fetch("/cms/api/seo-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.ok) return;
        const seo = data.seo;
        currentSlug = data.slug || currentSlug;
        if (els.seoTitle) els.seoTitle.textContent = seo.title || "—";
        if (els.seoDescription) els.seoDescription.textContent = seo.description || "—";
        if (els.seoUrl) els.seoUrl.textContent = seo.canonical || "—";
        if (els.seoSlug) els.seoSlug.textContent = data.slug || "—";
      } catch (_) {
        /* ignore */
      }
    }, 400);
  }

  ["input", "change"].forEach((ev) => {
    [els.title, els.body, els.brand, els.model, els.year, els.aiAssisted].forEach((el) => {
      el?.addEventListener(ev, updateSeoPreview);
    });
  });
  updateSeoPreview();

  function renderThumbnails() {
    if (!els.thumbnails) return;
    els.thumbnails.innerHTML = "";
    pendingFiles.forEach((file, i) => {
      const div = document.createElement("div");
      div.className = "cms-thumb" + (i === 0 && uploadedPaths.length === 0 ? " cms-thumb--hero" : "");
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.alt = file.name;
      div.appendChild(img);
      els.thumbnails.appendChild(div);
    });
    uploadedPaths.forEach((path, i) => {
      const div = document.createElement("div");
      div.className = "cms-thumb" + (i === 0 && pendingFiles.length === 0 ? " cms-thumb--hero" : "");
      const img = document.createElement("img");
      img.src = "/" + path.replace(/^\//, "");
      img.alt = path;
      div.appendChild(img);
      els.thumbnails.appendChild(div);
    });
  }

  async function uploadPending(slug) {
    if (!pendingFiles.length) return [];
    const form = new FormData();
    form.append("slug", slug);
    pendingFiles.forEach((f) => form.append("files", f));
    const res = await fetch("/cms/api/upload", { method: "POST", body: form });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Błąd uploadu");
    }
    const data = await res.json();
    uploadedPaths.push(...data.paths);
    pendingFiles = [];
    renderThumbnails();
    return data.paths;
  }

  function setupDropzone() {
    if (!els.dropzone || !els.fileInput) return;

    els.dropzone.addEventListener("click", (e) => {
      if (e.target.tagName !== "LABEL") els.fileInput.click();
    });

    els.fileInput.addEventListener("change", () => {
      pendingFiles.push(...Array.from(els.fileInput.files || []));
      els.fileInput.value = "";
      renderThumbnails();
    });

    ["dragenter", "dragover"].forEach((ev) => {
      els.dropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        els.dropzone.classList.add("is-dragover");
      });
    });

    ["dragleave", "drop"].forEach((ev) => {
      els.dropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        els.dropzone.classList.remove("is-dragover");
        if (ev === "drop" && e.dataTransfer?.files?.length) {
          pendingFiles.push(...Array.from(e.dataTransfer.files));
          renderThumbnails();
        }
      });
    });
  }

  setupDropzone();

  async function loadExistingImages() {
    if (!existingSlug) return;
    try {
      const res = await fetch(`/cms/api/seo-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_type: contentType, existing_slug: existingSlug, title: existingSlug }),
      });
    } catch (_) {}
    // Images from gallery dir — show via known slug path pattern
    const slug = existingSlug;
    const tryPaths = ["hero.webp", "01.webp", "1.webp"];
    for (const name of tryPaths) {
      const path = `galleries/${slug}/${name}`;
      const img = new Image();
      img.onload = () => {
        if (!uploadedPaths.includes(path)) {
          uploadedPaths.push(path);
          renderThumbnails();
        }
      };
      img.src = "/" + path;
    }
  }
  loadExistingImages();

  function setStatus(msg, isError) {
    if (!els.status) return;
    els.status.textContent = msg || "";
    els.status.style.color = isError ? "#b91c1c" : "";
  }

  function showSuccess(url) {
    if (!els.success) return;
    els.success.hidden = false;
    els.success.innerHTML =
      `Opublikowano! <a href="${url}" target="_blank" rel="noopener">${url}</a>` +
      `<button type="button" class="copy-url">Skopiuj URL</button>`;
    const btn = els.success.querySelector(".copy-url");
    btn?.addEventListener("click", () => {
      navigator.clipboard.writeText(url);
      btn.textContent = "Skopiowano!";
    });
    els.success.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function saveOrPublish(endpoint) {
    setStatus("Zapisywanie…");
    els.btnSave.disabled = true;
    els.btnPublish.disabled = true;

    try {
      // Save first to resolve slug, then upload images, then publish if needed
      let res = await fetch("/cms/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(collectPayload()),
      });
      let data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Błąd zapisu");

      currentSlug = data.slug;
      if (!existingSlug) existingSlug = data.slug;

      if (pendingFiles.length) {
        await uploadPending(currentSlug);
        res = await fetch("/cms/api/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(collectPayload()),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Błąd zapisu po uploadzie");
      }

      if (endpoint.includes("publish")) {
        res = await fetch("/cms/api/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(collectPayload()),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Błąd publikacji");

        if (data.ok) {
          setStatus("Opublikowano");
          showSuccess(data.url);
        } else {
          setStatus("Zapisano, ale deploy nie powiódł się", true);
          console.log(data.deploy_log);
        }
      } else {
        setStatus("Szkic zapisany");
      }
    } catch (err) {
      setStatus(err.message || "Błąd", true);
    } finally {
      els.btnSave.disabled = false;
      els.btnPublish.disabled = false;
    }
  }

  els.btnSave?.addEventListener("click", () => saveOrPublish("/cms/api/save"));
  els.btnPublish?.addEventListener("click", () => saveOrPublish("/cms/api/publish"));
})();
