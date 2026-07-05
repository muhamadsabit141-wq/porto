/* =========================================================
   RAJA SUBHAN ALPARIZ — PORTFOLIO
   script.js — Public data fetching & DOM rendering
   ========================================================= */

/* -----------------------------------------------------------
   1. KONFIGURASI SUPABASE
   Ganti dua variabel di bawah ini dengan kredensial project
   Supabase Anda sendiri (Settings > API di dashboard Supabase).
----------------------------------------------------------- */
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-SUPABASE-ANON-PUBLIC-KEY";

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

/**
 * Membersihkan container lalu mengisi dengan node baru.
 * Mencegah duplikasi elemen saat refresh / re-fetch.
 */
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
   3. FETCH: PROFILE (Tentang Saya)
----------------------------------------------------------- */
async function fetchProfile() {
  const aboutEl = document.getElementById("about-text");
  const photoEl = document.getElementById("profile-photo");
  if (!aboutEl) return;

  if (!supabaseClient) {
    aboutEl.textContent = "Layanan data sedang tidak tersedia. Silakan coba lagi nanti.";
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("profile")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (data && data.foto_url && photoEl) {
      photoEl.src = data.foto_url;
    }

    if (!data || !data.deskripsi) {
      aboutEl.textContent =
        "Profil belum tersedia saat ini. Silakan kembali lagi nanti untuk membaca lebih lanjut tentang saya.";
      return;
    }

    aboutEl.textContent = data.deskripsi;
  } catch (err) {
    console.error("Gagal memuat data profile:", err);
    aboutEl.textContent =
      "Terjadi kendala saat memuat profil. Periksa koneksi internet Anda dan muat ulang halaman.";
  }
}

/* -----------------------------------------------------------
   4. FETCH: KEGIATAN
----------------------------------------------------------- */
async function fetchKegiatan() {
  const container = document.getElementById("kegiatan-grid");
  if (!container) return;

  if (!supabaseClient) {
    renderInto(container, createErrorState("Layanan data sedang tidak tersedia."));
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("kegiatan")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      renderInto(container, createEmptyState("Belum ada kegiatan yang ditambahkan."));
      return;
    }

    const cards = data.map((item) => {
      const card = document.createElement("article");
      card.className = "kegiatan-card";

      if (item.media_url) {
        const mediaWrap = document.createElement("div");
        mediaWrap.className = "kegiatan-card-media";

        if (item.media_type === "video") {
          const video = document.createElement("video");
          video.src = item.media_url;
          video.controls = true;
          video.preload = "metadata";
          mediaWrap.appendChild(video);
        } else {
          const img = document.createElement("img");
          img.src = item.media_url;
          img.alt = escapeText(item.judul || "Kegiatan");
          img.loading = "lazy";
          mediaWrap.appendChild(img);
        }

        card.appendChild(mediaWrap);
      } else {
        const icon = document.createElement("div");
        icon.className = "kegiatan-card-icon";
        icon.innerHTML = '<i class="fa-solid fa-bolt"></i>';
        card.appendChild(icon);
      }

      const meta = document.createElement("span");
      meta.className = "kegiatan-card-meta";
      meta.textContent = escapeText(item.kategori || item.tanggal || "Kegiatan");

      const title = document.createElement("h3");
      title.className = "kegiatan-card-title";
      title.textContent = escapeText(item.judul || "Tanpa judul");

      const desc = document.createElement("p");
      desc.className = "kegiatan-card-desc";
      desc.textContent = escapeText(item.deskripsi || "Deskripsi belum tersedia.");

      card.append(meta, title, desc);
      return card;
    });

    renderInto(container, cards);
  } catch (err) {
    console.error("Gagal memuat data kegiatan:", err);
    renderInto(
      container,
      createErrorState("Terjadi kendala saat memuat data kegiatan. Silakan muat ulang halaman.")
    );
  }
}

/* -----------------------------------------------------------
   5. FETCH: PRESTASI
----------------------------------------------------------- */
async function fetchPrestasi() {
  const container = document.getElementById("prestasi-timeline");
  if (!container) return;

  if (!supabaseClient) {
    renderInto(container, createErrorState("Layanan data sedang tidak tersedia."));
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("prestasi")
      .select("*")
      .order("tahun", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      renderInto(container, createEmptyState("Belum ada prestasi yang ditambahkan."));
      return;
    }

    const items = data.map((item) => {
      const wrap = document.createElement("div");
      wrap.className = "prestasi-item";

      const year = document.createElement("span");
      year.className = "prestasi-year";
      year.textContent = escapeText(item.tahun || "-");

      const title = document.createElement("h3");
      title.className = "prestasi-title";
      title.textContent = escapeText(item.nama || "Tanpa nama");

      const desc = document.createElement("p");
      desc.className = "prestasi-desc";
      desc.textContent = escapeText(item.deskripsi || "Deskripsi belum tersedia.");

      wrap.append(year, title, desc);

      if (item.media_url) {
        const mediaWrap = document.createElement("div");
        mediaWrap.className = "prestasi-media";

        if (item.media_type === "video") {
          const video = document.createElement("video");
          video.src = item.media_url;
          video.controls = true;
          video.preload = "metadata";
          mediaWrap.appendChild(video);
        } else {
          const img = document.createElement("img");
          img.src = item.media_url;
          img.alt = escapeText(item.nama || "Prestasi");
          img.loading = "lazy";
          mediaWrap.appendChild(img);
        }

        wrap.appendChild(mediaWrap);
      }

      return wrap;
    });

    renderInto(container, items);
  } catch (err) {
    console.error("Gagal memuat data prestasi:", err);
    renderInto(
      container,
      createErrorState("Terjadi kendala saat memuat data prestasi. Silakan muat ulang halaman.")
    );
  }
}

/* -----------------------------------------------------------
   6. FETCH: SOSMED & KONTAK
----------------------------------------------------------- */
async function fetchSosmed() {
  const container = document.getElementById("sosmed-links");
  if (!container) return;

  if (!supabaseClient) {
    renderInto(container, createErrorState("Layanan data sedang tidak tersedia."));
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("sosmed")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      renderInto(container, createEmptyState("Tautan kontak belum tersedia."));
      return;
    }

    const links = [];

    if (data.tiktok) {
      links.push({ url: data.tiktok, label: "TikTok", icon: "fa-brands fa-tiktok" });
    }
    if (data.instagram) {
      links.push({ url: data.instagram, label: "Instagram", icon: "fa-brands fa-instagram" });
    }
    if (data.email) {
      const mailHref = data.email.startsWith("mailto:") ? data.email : `mailto:${data.email}`;
      links.push({ url: mailHref, label: "Email", icon: "fa-solid fa-envelope" });
    }

    if (data.file_url) {
      links.push({ url: data.file_url, label: "Unduh CV", icon: "fa-solid fa-file-arrow-down" });
    }

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
  } catch (err) {
    console.error("Gagal memuat data sosmed:", err);
    renderInto(
      container,
      createErrorState("Terjadi kendala saat memuat tautan kontak. Silakan muat ulang halaman.")
    );
  }
}

/* -----------------------------------------------------------
   7. ORKESTRASI FETCH
----------------------------------------------------------- */
async function fetchPortfolioData() {
  await Promise.all([fetchProfile(), fetchKegiatan(), fetchPrestasi(), fetchSosmed()]);
}

/* -----------------------------------------------------------
   8. UI: TYPING TAGLINE EFFECT
----------------------------------------------------------- */
function initTaglineTyping() {
  const el = document.getElementById("tagline-text");
  if (!el) return;

  const phrases = [
    "Pelajar yang gemar mengeksplorasi teknologi.",
    "Bersemangat membangun karya digital.",
    "Terus belajar, terus bertumbuh.",
  ];

  let phraseIndex = 0;
  let charIndex = 0;
  let deleting = false;

  function tick() {
    const current = phrases[phraseIndex];

    if (!deleting) {
      charIndex++;
      el.textContent = current.slice(0, charIndex);
      if (charIndex === current.length) {
        deleting = true;
        setTimeout(tick, 1800);
        return;
      }
    } else {
      charIndex--;
      el.textContent = current.slice(0, charIndex);
      if (charIndex === 0) {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
      }
    }

    setTimeout(tick, deleting ? 35 : 60);
  }

  tick();
}

/* -----------------------------------------------------------
   9. UI: MOBILE NAV TOGGLE
----------------------------------------------------------- */
function initMobileNav() {
  const toggle = document.getElementById("nav-toggle");
  const navList = document.querySelector(".nav-list");
  if (!toggle || !navList) return;

  toggle.addEventListener("click", () => {
    const isOpen = navList.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  navList.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      navList.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* -----------------------------------------------------------
   10. UI: SCROLL FADE-IN OBSERVER
----------------------------------------------------------- */
function initScrollFadeIn() {
  const targets = document.querySelectorAll(".section");
  if (!("IntersectionObserver" in window) || targets.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("fade-in-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  targets.forEach((target) => observer.observe(target));
}

/* -----------------------------------------------------------
   11. INIT
----------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("footer-year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  initTaglineTyping();
  initMobileNav();
  initScrollFadeIn();
  fetchPortfolioData();
});
