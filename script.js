/* =========================================================
   RAJA SUBHAN ALPARIZ — PORTFOLIO v2
   script.js — Routing, data fetching, gallery lightbox
   ========================================================= */

/* -----------------------------------------------------------
   1. KONFIGURASI SUPABASE
----------------------------------------------------------- */
const SUPABASE_URL = "https://kpvbbostervhfyhcnojo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwdmJib3N0ZXJ2aGZ5aGNub2pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMzU4NTYsImV4cCI6MjA5ODgxMTg1Nn0.RgpZVgIv1L-UR3MXjoIwRKr6Qx_GkHuvbxiXWfVnSuw";

let supabaseClient = null;

try {
  if (window.supabase && typeof window.supabase.createClient === "function") {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    console.error("Supabase SDK gagal dimuat dari CDN.");
  }
} catch (err) {
  console.error("Gagal menginisialisasi Supabase client:", err);
}

/* -----------------------------------------------------------
   2. UTILITAS DOM
----------------------------------------------------------- */
function renderInto(container, nodes) {
  if (!container) return;
  container.innerHTML = "";
  if (Array.isArray(nodes)) {
    nodes.forEach((node) => container.appendChild(node));
  } else if (nodes) {
    container.appendChild(nodes);
  }
}

function createEmptyState(message) {
  const p = document.createElement("p");
  p.className = "empty-text";
  p.textContent = message;
  return p;
}

function createErrorState(message) {
  const p = document.createElement("p");
  p.className = "error-text";
  p.textContent = message;
  return p;
}

function escapeText(value) {
  return value === null || value === undefined ? "" : String(value);
}

/* -----------------------------------------------------------
   3. ROUTING — perpindahan "halaman" tanpa reload / scroll-jump
----------------------------------------------------------- */
const VALID_PAGES = ["beranda", "tentang", "pendidikan", "organisasi", "kegiatan", "prestasi", "kontak"];

function navigateTo(pageId, updateHash = true) {
  if (!VALID_PAGES.includes(pageId)) pageId = "beranda";

  document.querySelectorAll(".page").forEach((el) => el.classList.remove("active"));
  const target = document.querySelector(`.page[data-page="${pageId}"]`);
  if (target) target.classList.add("active");

  document.querySelectorAll(".sidebar-nav-item").forEach((li) => {
    li.classList.toggle("active", li.getAttribute("data-page") === pageId);
  });

  if (updateHash) {
    history.replaceState(null, "", "#" + pageId);
  }

  const viewport = document.getElementById("page-viewport");
  if (viewport) viewport.scrollTo({ top: 0, behavior: "instant" });
  window.scrollTo({ top: 0, behavior: "instant" });

  closeMobileSidebar();
}

function initRouting() {
  document.querySelectorAll(".sidebar-nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const li = link.closest(".sidebar-nav-item");
      const pageId = li ? li.getAttribute("data-page") : "beranda";
      navigateTo(pageId);
    });
  });

  document.querySelectorAll("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => navigateTo(btn.getAttribute("data-goto")));
  });

  const initialHash = window.location.hash.replace("#", "");
  navigateTo(initialHash || "beranda", false);
}

/* -----------------------------------------------------------
   4. MOBILE SIDEBAR TOGGLE
----------------------------------------------------------- */
function openMobileSidebar() {
  document.getElementById("sidebar").classList.add("open");
  document.getElementById("sidebar-overlay").classList.add("open");
}

function closeMobileSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebar-overlay").classList.remove("open");
}

function initMobileSidebar() {
  const toggle = document.getElementById("mobile-nav-toggle");
  const overlay = document.getElementById("sidebar-overlay");
  if (toggle) toggle.addEventListener("click", openMobileSidebar);
  if (overlay) overlay.addEventListener("click", closeMobileSidebar);
}

/* -----------------------------------------------------------
   5. FETCH: PROFILE
----------------------------------------------------------- */
function applyNameToHero(nama) {
  const heroNameEl = document.querySelector(".hero-name");
  const sidebarNameEl = document.getElementById("sidebar-name");
  const fullName = nama && nama.trim() ? nama.trim() : "Raja Subhan Alpariz";

  if (sidebarNameEl) sidebarNameEl.textContent = fullName;

  if (heroNameEl) {
    const words = fullName.split(" ");
    const lastWord = words.pop();
    const firstPart = words.join(" ");

    heroNameEl.innerHTML = "";
    heroNameEl.appendChild(document.createTextNode(firstPart ? `${firstPart} ` : ""));
    const accentSpan = document.createElement("span");
    accentSpan.className = "accent";
    accentSpan.textContent = lastWord;
    heroNameEl.appendChild(accentSpan);
  }
}

async function fetchProfile() {
  const aboutEl = document.getElementById("about-text");
  const photoEl = document.getElementById("profile-photo");
  const avatarEl = document.getElementById("sidebar-avatar");
  const kampusEl = document.getElementById("fact-kampus");
  const jurusanEl = document.getElementById("fact-jurusan");
  const roleEl = document.getElementById("sidebar-role");

  if (!supabaseClient) {
    if (aboutEl) aboutEl.textContent = "Layanan data sedang tidak tersedia. Silakan coba lagi nanti.";
    return;
  }

  try {
    const { data, error } = await supabaseClient.from("profile").select("*").limit(1).maybeSingle();
    if (error) throw error;

    applyNameToHero(data && data.nama);

    if (data && data.foto_url) {
      if (photoEl) photoEl.src = data.foto_url;
      if (avatarEl) avatarEl.src = data.foto_url;
    }

    if (kampusEl) kampusEl.textContent = data && data.kampus ? data.kampus : "Belum diisi";
    if (jurusanEl) jurusanEl.textContent = data && data.jurusan ? data.jurusan : "Belum diisi";
    if (roleEl) roleEl.textContent = data && data.kampus ? data.kampus : "STIES KHAS Kempek Al-Jaelani";

    if (!data || !data.deskripsi) {
      if (aboutEl) aboutEl.textContent = "Profil belum tersedia saat ini. Silakan kembali lagi nanti.";
    } else if (aboutEl) {
      aboutEl.textContent = data.deskripsi;
    }

    initTaglineOnce(data && data.tagline ? data.tagline : "Mahasiswa yang bersemangat berkontribusi dan terus bertumbuh.");
  } catch (err) {
    console.error("Gagal memuat data profile:", err);
    if (aboutEl) aboutEl.textContent = "Terjadi kendala saat memuat profil. Periksa koneksi internet Anda.";
    initTaglineOnce("Mahasiswa yang bersemangat berkontribusi dan terus bertumbuh.");
  }
}

/* -----------------------------------------------------------
   6. FETCH: PENDIDIKAN
----------------------------------------------------------- */
async function fetchPendidikan() {
  const container = document.getElementById("pendidikan-grid");
  if (!container) return;

  if (!supabaseClient) {
    renderInto(container, createErrorState("Layanan data sedang tidak tersedia."));
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("pendidikan")
      .select("*, pendidikan_media(id, media_url, media_type, urutan)")
      .order("urutan", { ascending: true })
      .order("urutan", { foreignTable: "pendidikan_media", ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      renderInto(container, createEmptyState("Belum ada riwayat pendidikan yang ditambahkan."));
      return;
    }

    const cards = data.map((item) => {
      const gallery = Array.isArray(item.pendidikan_media) ? item.pendidikan_media : [];
      const card = document.createElement("article");
      card.className = "org-card";

      const logo = document.createElement("div");
      logo.className = "org-logo";
      const firstImage = gallery.find((g) => g.media_type !== "video");
      if (firstImage) {
        const img = document.createElement("img");
        img.src = firstImage.media_url;
        img.alt = escapeText(item.institusi || "Pendidikan");
        logo.appendChild(img);
      } else {
        logo.innerHTML = '<i class="fa-solid fa-graduation-cap"></i>';
      }

      const info = document.createElement("div");
      const name = document.createElement("h3");
      name.className = "org-name";
      name.textContent = escapeText(item.institusi || "Institusi belum diisi");

      const role = document.createElement("p");
      role.className = "org-role";
      role.textContent = escapeText(item.jenjang || "");

      const periode = [item.tahun_mulai, item.tahun_selesai].filter(Boolean).join(" – ");
      const period = document.createElement("p");
      period.className = "org-period";
      period.textContent = periode;

      const desc = document.createElement("p");
      desc.className = "org-desc";
      desc.textContent = escapeText(item.deskripsi || "Belum ada deskripsi.");

      const hint = document.createElement("span");
      hint.className = "org-card-hint";
      hint.innerHTML = '<i class="fa-solid fa-expand"></i> Lihat detail';

      info.append(name, role, period, desc, hint);
      card.append(logo, info);

      card.addEventListener("click", () => {
        openDetailModal({
          eyebrow: "Pendidikan",
          title: item.institusi || "Institusi belum diisi",
          meta: periode || item.jenjang || "",
          description: item.deskripsi_panjang || item.deskripsi || "Belum ada deskripsi lebih lanjut.",
          gallery: gallery.map((g) => ({ url: g.media_url, type: g.media_type })),
        });
      });

      return card;
    });

    renderInto(container, cards);
  } catch (err) {
    console.error("Gagal memuat pendidikan:", err);
    renderInto(container, createErrorState("Terjadi kendala saat memuat data pendidikan."));
  }
}

/* -----------------------------------------------------------
   7. FETCH: ORGANISASI
----------------------------------------------------------- */
async function fetchOrganisasi() {
  const container = document.getElementById("organisasi-grid");
  const statEl = document.getElementById("stat-organisasi");
  if (!container) return;

  if (!supabaseClient) {
    renderInto(container, createErrorState("Layanan data sedang tidak tersedia."));
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("organisasi")
      .select("*, organisasi_media(id, media_url, media_type, urutan)")
      .order("urutan", { ascending: true })
      .order("urutan", { foreignTable: "organisasi_media", ascending: true });

    if (error) throw error;

    if (statEl) statEl.textContent = data ? data.length : 0;

    if (!data || data.length === 0) {
      renderInto(container, createEmptyState("Belum ada data organisasi."));
      return;
    }

    const cards = data.map((item) => {
      const gallery = Array.isArray(item.organisasi_media) ? item.organisasi_media : [];
      const card = document.createElement("article");
      card.className = "org-card";

      const logo = document.createElement("div");
      logo.className = "org-logo";
      if (item.logo_url) {
        const img = document.createElement("img");
        img.src = item.logo_url;
        img.alt = escapeText(item.nama_organisasi || "Logo organisasi");
        logo.appendChild(img);
      } else {
        logo.innerHTML = '<i class="fa-solid fa-people-group"></i>';
      }

      const info = document.createElement("div");
      const name = document.createElement("h3");
      name.className = "org-name";
      name.textContent = escapeText(item.nama_organisasi || "Tanpa nama");

      const role = document.createElement("p");
      role.className = "org-role";
      role.textContent = escapeText(item.jabatan || "");

      const period = document.createElement("p");
      period.className = "org-period";
      period.textContent = escapeText(item.periode || "");

      const desc = document.createElement("p");
      desc.className = "org-desc";
      desc.textContent = escapeText(item.deskripsi || "Belum ada deskripsi.");

      const hint = document.createElement("span");
      hint.className = "org-card-hint";
      hint.innerHTML = '<i class="fa-solid fa-expand"></i> Lihat detail';

      info.append(name, role, period, desc, hint);
      card.append(logo, info);

      card.addEventListener("click", () => {
        openDetailModal({
          eyebrow: "Organisasi",
          title: item.nama_organisasi || "Tanpa nama",
          meta: [item.jabatan, item.periode].filter(Boolean).join(" · "),
          description: item.deskripsi_panjang || item.deskripsi || "Belum ada deskripsi lebih lanjut.",
          gallery: gallery.map((g) => ({ url: g.media_url, type: g.media_type })),
        });
      });

      return card;
    });

    renderInto(container, cards);
  } catch (err) {
    console.error("Gagal memuat organisasi:", err);
    renderInto(container, createErrorState("Terjadi kendala saat memuat data organisasi."));
  }
}

/* -----------------------------------------------------------
   8. FETCH: KEGIATAN (+ galeri media)
----------------------------------------------------------- */
async function fetchKegiatan() {
  const container = document.getElementById("kegiatan-grid");
  const statEl = document.getElementById("stat-kegiatan");
  if (!container) return;

  if (!supabaseClient) {
    renderInto(container, createErrorState("Layanan data sedang tidak tersedia."));
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("kegiatan")
      .select("*, kegiatan_media(id, media_url, media_type, urutan)")
      .order("urutan", { ascending: true })
      .order("urutan", { foreignTable: "kegiatan_media", ascending: true });

    if (error) throw error;

    if (statEl) statEl.textContent = data ? data.length : 0;

    if (!data || data.length === 0) {
      renderInto(container, createEmptyState("Belum ada kegiatan yang ditambahkan."));
      return;
    }

    const cards = data.map((item) => {
      const gallery = Array.isArray(item.kegiatan_media) ? item.kegiatan_media : [];
      const card = document.createElement("article");
      card.className = "kegiatan-card";

      if (gallery.length > 0) {
        const mediaWrap = document.createElement("div");
        mediaWrap.className = "kegiatan-card-media";

        const first = gallery[0];
        if (first.media_type === "video") {
          const video = document.createElement("video");
          video.src = first.media_url;
          video.muted = true;
          mediaWrap.appendChild(video);
        } else {
          const img = document.createElement("img");
          img.src = first.media_url;
          img.alt = escapeText(item.judul || "Kegiatan");
          img.loading = "lazy";
          mediaWrap.appendChild(img);
        }

        if (gallery.length > 1) {
          const countBadge = document.createElement("span");
          countBadge.className = "gallery-count";
          countBadge.innerHTML = `<i class="fa-solid fa-images"></i> ${gallery.length}`;
          mediaWrap.appendChild(countBadge);
        }

        card.appendChild(mediaWrap);
      } else {
        const noImg = document.createElement("div");
        noImg.className = "kegiatan-card-noimg";
        noImg.innerHTML = '<i class="fa-solid fa-bolt"></i>';
        card.appendChild(noImg);
      }

      const body = document.createElement("div");
      body.className = "kegiatan-card-body";

      const meta = document.createElement("span");
      meta.className = "kegiatan-card-meta";
      meta.textContent = escapeText(item.kategori || "Kegiatan");

      const title = document.createElement("h3");
      title.className = "kegiatan-card-title";
      title.textContent = escapeText(item.judul || "Tanpa judul");

      const desc = document.createElement("p");
      desc.className = "kegiatan-card-desc";
      desc.textContent = escapeText(item.deskripsi || "Deskripsi belum tersedia.");

      body.append(meta, title, desc);
      card.appendChild(body);

      card.addEventListener("click", () => {
        openDetailModal({
          eyebrow: "Kegiatan",
          title: item.judul || "Tanpa judul",
          meta: item.kategori || "",
          description: item.deskripsi_panjang || item.deskripsi || "Belum ada deskripsi lebih lanjut.",
          gallery: gallery.map((g) => ({ url: g.media_url, type: g.media_type })),
        });
      });
      return card;
    });

    renderInto(container, cards);
  } catch (err) {
    console.error("Gagal memuat kegiatan:", err);
    renderInto(container, createErrorState("Terjadi kendala saat memuat data kegiatan."));
  }
}

/* -----------------------------------------------------------
   9. FETCH: PRESTASI (+ galeri media)
----------------------------------------------------------- */
async function fetchPrestasi() {
  const container = document.getElementById("prestasi-timeline");
  const statEl = document.getElementById("stat-prestasi");
  if (!container) return;

  if (!supabaseClient) {
    renderInto(container, createErrorState("Layanan data sedang tidak tersedia."));
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("prestasi")
      .select("*, prestasi_media(id, media_url, media_type, urutan)")
      .order("urutan", { ascending: true })
      .order("urutan", { foreignTable: "prestasi_media", ascending: true });

    if (error) throw error;

    if (statEl) statEl.textContent = data ? data.length : 0;

    if (!data || data.length === 0) {
      renderInto(container, createEmptyState("Belum ada prestasi yang ditambahkan."));
      return;
    }

    const items = data.map((item) => {
      const gallery = Array.isArray(item.prestasi_media) ? item.prestasi_media : [];
      const wrap = document.createElement("div");
      wrap.className = "timeline-item";

      const badge = document.createElement("span");
      badge.className = "timeline-badge";
      badge.textContent = escapeText(item.tahun || "-");

      const title = document.createElement("h3");
      title.className = "timeline-title";
      title.textContent = escapeText(item.nama || "Tanpa nama");

      const desc = document.createElement("p");
      desc.className = "timeline-desc";
      desc.textContent = escapeText(item.deskripsi || "Deskripsi belum tersedia.");

      const hint = document.createElement("span");
      hint.className = "timeline-item-hint";
      hint.innerHTML = '<i class="fa-solid fa-expand"></i> Lihat detail';

      wrap.append(badge, title, desc, hint);

      if (gallery.length > 0) {
        const galleryWrap = document.createElement("div");
        galleryWrap.className = "timeline-gallery";

        gallery.forEach((g, idx) => {
          const thumb = document.createElement("div");
          thumb.className = "timeline-gallery-thumb";

          if (g.media_type === "video") {
            const video = document.createElement("video");
            video.src = g.media_url;
            video.muted = true;
            const badgeIcon = document.createElement("span");
            badgeIcon.className = "play-badge";
            badgeIcon.innerHTML = '<i class="fa-solid fa-play"></i>';
            thumb.append(video, badgeIcon);
          } else {
            const img = document.createElement("img");
            img.src = g.media_url;
            img.alt = escapeText(item.nama || "Prestasi");
            img.loading = "lazy";
            thumb.appendChild(img);
          }

          thumb.addEventListener("click", (e) => {
            e.stopPropagation();
            openLightbox(gallery.map((m) => ({ url: m.media_url, type: m.media_type })), idx);
          });

          galleryWrap.appendChild(thumb);
        });

        wrap.appendChild(galleryWrap);
      }

      wrap.addEventListener("click", () => {
        openDetailModal({
          eyebrow: "Prestasi",
          title: item.nama || "Tanpa nama",
          meta: item.tahun || "",
          description: item.deskripsi_panjang || item.deskripsi || "Belum ada deskripsi lebih lanjut.",
          gallery: gallery.map((g) => ({ url: g.media_url, type: g.media_type })),
        });
      });

      return wrap;
    });

    renderInto(container, items);
  } catch (err) {
    console.error("Gagal memuat prestasi:", err);
    renderInto(container, createErrorState("Terjadi kendala saat memuat data prestasi."));
  }
}

/* -----------------------------------------------------------
   10. FETCH: SOSMED & KONTAK
----------------------------------------------------------- */
async function fetchSosmed() {
  const container = document.getElementById("sosmed-links");
  if (!container) return;

  if (!supabaseClient) {
    renderInto(container, createErrorState("Layanan data sedang tidak tersedia."));
    return;
  }

  try {
    const { data, error } = await supabaseClient.from("sosmed").select("*").limit(1).maybeSingle();
    if (error) throw error;

    if (!data) {
      renderInto(container, createEmptyState("Tautan kontak belum tersedia."));
      return;
    }

    const links = [];
    if (data.tiktok) links.push({ url: data.tiktok, label: "TikTok", icon: "fa-brands fa-tiktok" });
    if (data.instagram) links.push({ url: data.instagram, label: "Instagram", icon: "fa-brands fa-instagram" });
    if (data.email) {
      const mailHref = data.email.startsWith("mailto:") ? data.email : `mailto:${data.email}`;
      links.push({ url: mailHref, label: "Email", icon: "fa-solid fa-envelope" });
    }
    if (data.file_url) links.push({ url: data.file_url, label: "Unduh CV", icon: "fa-solid fa-file-arrow-down" });

    if (links.length === 0) {
      renderInto(container, createEmptyState("Tautan kontak belum tersedia."));
      return;
    }

    const buttons = links.map((link) => {
      const a = document.createElement("a");
      a.className = "sosmed-btn";
      a.href = link.url;
      a.target = link.label === "Email" ? "_self" : "_blank";
      a.rel = "noopener noreferrer";
      a.innerHTML = `<i class="${link.icon}"></i><span>${link.label}</span>`;
      return a;
    });

    renderInto(container, buttons);

    const socialIconWrap = document.getElementById("sidebar-social");
    if (socialIconWrap) {
      socialIconWrap.innerHTML = "";
      links.slice(0, 4).forEach((link) => {
        const a = document.createElement("a");
        a.href = link.url;
        a.target = link.label === "Email" ? "_self" : "_blank";
        a.rel = "noopener noreferrer";
        a.title = link.label;
        a.innerHTML = `<i class="${link.icon}"></i>`;
        socialIconWrap.appendChild(a);
      });
    }
  } catch (err) {
    console.error("Gagal memuat data sosmed:", err);
    renderInto(container, createErrorState("Terjadi kendala saat memuat tautan kontak."));
  }
}

/* -----------------------------------------------------------
   11. ORKESTRASI FETCH
----------------------------------------------------------- */
async function fetchPortfolioData() {
  await Promise.all([
    fetchProfile(),
    fetchPendidikan(),
    fetchOrganisasi(),
    fetchKegiatan(),
    fetchPrestasi(),
    fetchSosmed(),
  ]);
}

/* -----------------------------------------------------------
   12. TAGLINE — diketik sekali (kesan lebih formal/profesional)
----------------------------------------------------------- */
let taglineTyped = false;

function initTaglineOnce(phrase) {
  if (taglineTyped) return;
  taglineTyped = true;

  const el = document.getElementById("tagline-text");
  if (!el || !phrase) return;

  let charIndex = 0;

  function tick() {
    charIndex++;
    el.textContent = phrase.slice(0, charIndex);
    if (charIndex < phrase.length) {
      setTimeout(tick, 32);
    }
  }

  tick();
}

/* -----------------------------------------------------------
   13. LIGHTBOX GALERI
----------------------------------------------------------- */
const lightboxState = { items: [], index: 0 };

function renderLightboxMedia() {
  const slot = document.getElementById("lightbox-media-slot");
  if (!slot) return;
  slot.innerHTML = "";

  const item = lightboxState.items[lightboxState.index];
  if (!item) return;

  if (item.type === "video") {
    const video = document.createElement("video");
    video.src = item.url;
    video.controls = true;
    video.autoplay = true;
    slot.appendChild(video);
  } else {
    const img = document.createElement("img");
    img.src = item.url;
    img.alt = "Media";
    slot.appendChild(img);
  }

  const prevBtn = document.getElementById("lightbox-prev");
  const nextBtn = document.getElementById("lightbox-next");
  const multi = lightboxState.items.length > 1;
  if (prevBtn) prevBtn.style.display = multi ? "flex" : "none";
  if (nextBtn) nextBtn.style.display = multi ? "flex" : "none";
}

function openLightbox(items, startIndex) {
  if (!items || items.length === 0) return;
  lightboxState.items = items;
  lightboxState.index = startIndex || 0;
  renderLightboxMedia();
  document.getElementById("lightbox-overlay").classList.add("open");
}

function closeLightbox() {
  document.getElementById("lightbox-overlay").classList.remove("open");
  const slot = document.getElementById("lightbox-media-slot");
  if (slot) slot.innerHTML = "";
}

function lightboxNext() {
  lightboxState.index = (lightboxState.index + 1) % lightboxState.items.length;
  renderLightboxMedia();
}

function lightboxPrev() {
  lightboxState.index = (lightboxState.index - 1 + lightboxState.items.length) % lightboxState.items.length;
  renderLightboxMedia();
}

function initLightbox() {
  document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
  document.getElementById("lightbox-next").addEventListener("click", lightboxNext);
  document.getElementById("lightbox-prev").addEventListener("click", lightboxPrev);
  document.getElementById("lightbox-overlay").addEventListener("click", (e) => {
    if (e.target.id === "lightbox-overlay") closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    const overlay = document.getElementById("lightbox-overlay");
    if (!overlay.classList.contains("open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") lightboxNext();
    if (e.key === "ArrowLeft") lightboxPrev();
  });
}

/* -----------------------------------------------------------
   13B. DETAIL MODAL — deskripsi panjang + galeri (dipakai semua section)
----------------------------------------------------------- */
function openDetailModal({ eyebrow, title, meta, description, gallery }) {
  document.getElementById("detail-modal-eyebrow").textContent = eyebrow || "";
  document.getElementById("detail-modal-title").textContent = title || "";
  document.getElementById("detail-modal-meta").textContent = meta || "";
  document.getElementById("detail-modal-desc").textContent = description || "";

  const galleryEl = document.getElementById("detail-modal-gallery");
  galleryEl.innerHTML = "";

  const items = Array.isArray(gallery) ? gallery : [];
  items.forEach((g, idx) => {
    const thumb = document.createElement("div");
    thumb.className = "detail-modal-gallery-thumb";

    if (g.type === "video") {
      const video = document.createElement("video");
      video.src = g.url;
      video.muted = true;
      const badgeIcon = document.createElement("span");
      badgeIcon.className = "play-badge";
      badgeIcon.innerHTML = '<i class="fa-solid fa-play"></i>';
      thumb.append(video, badgeIcon);
    } else {
      const img = document.createElement("img");
      img.src = g.url;
      img.alt = escapeText(title || "Media");
      img.loading = "lazy";
      thumb.appendChild(img);
    }

    thumb.addEventListener("click", () => openLightbox(items, idx));
    galleryEl.appendChild(thumb);
  });

  document.getElementById("detail-modal-overlay").classList.add("open");
}

function closeDetailModal() {
  document.getElementById("detail-modal-overlay").classList.remove("open");
}

function initDetailModal() {
  document.getElementById("detail-modal-close").addEventListener("click", closeDetailModal);
  document.getElementById("detail-modal-overlay").addEventListener("click", (e) => {
    if (e.target.id === "detail-modal-overlay") closeDetailModal();
  });
  document.addEventListener("keydown", (e) => {
    const overlay = document.getElementById("detail-modal-overlay");
    if (!overlay.classList.contains("open")) return;
    if (e.key === "Escape") closeDetailModal();
  });
}

/* -----------------------------------------------------------
   14. INIT
----------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("footer-year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  initRouting();
  initMobileSidebar();
  initLightbox();
  initDetailModal();
  fetchPortfolioData();
});
