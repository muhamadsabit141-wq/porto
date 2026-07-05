/* =========================================================
   RAJA SUBHAN ALPARIZ — PORTFOLIO
   admin.js — Login guard & CRUD logic for dashboard
   ========================================================= */

/* -----------------------------------------------------------
   1. KONFIGURASI SUPABASE
   PENTING: Samakan nilai ini dengan yang ada di script.js
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
   2. KREDENSIAL ADMIN (STATIS / HARDCODED)
   Catatan: metode ini hanya proteksi dasar di sisi klien.
   Untuk keamanan penuh, gunakan Supabase Auth di produksi.
----------------------------------------------------------- */
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "rsa-admin-2026";
const SESSION_KEY = "rsa_admin_logged_in";

/* -----------------------------------------------------------
   3. ELEMEN DOM
----------------------------------------------------------- */
const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const loginSubmitBtn = document.getElementById("login-submit-btn");
const logoutBtn = document.getElementById("logout-btn");

const profileTextarea = document.getElementById("profile-textarea");
const saveProfileBtn = document.getElementById("save-profile-btn");

const kegiatanList = document.getElementById("kegiatan-list");
const kegiatanForm = document.getElementById("kegiatan-form");
const kegiatanJudul = document.getElementById("kegiatan-judul");
const kegiatanKategori = document.getElementById("kegiatan-kategori");
const kegiatanDeskripsi = document.getElementById("kegiatan-deskripsi");
const kegiatanSubmitBtn = document.getElementById("kegiatan-submit-btn");

const prestasiList = document.getElementById("prestasi-list");
const prestasiForm = document.getElementById("prestasi-form");
const prestasiNama = document.getElementById("prestasi-nama");
const prestasiTahun = document.getElementById("prestasi-tahun");
const prestasiDeskripsi = document.getElementById("prestasi-deskripsi");
const prestasiSubmitBtn = document.getElementById("prestasi-submit-btn");

const sosmedForm = document.getElementById("sosmed-form");
const sosmedTiktok = document.getElementById("sosmed-tiktok");
const sosmedInstagram = document.getElementById("sosmed-instagram");
const sosmedEmail = document.getElementById("sosmed-email");
const sosmedSubmitBtn = document.getElementById("sosmed-submit-btn");

/* -----------------------------------------------------------
   4. UTILITAS: TOAST NOTIFIKASI
----------------------------------------------------------- */
function showToast(message, isError = false) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast" + (isError ? " toast-error" : "");
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3200);
}

function escapeText(value) {
  return value === null || value === undefined ? "" : String(value);
}

function setButtonLoading(button, isLoading, loadingText, defaultText) {
  if (!button) return;
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : defaultText;
}

/* -----------------------------------------------------------
   5. PROTEKSI LOGIN
----------------------------------------------------------- */
function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === "true";
}

function showDashboard() {
  loginSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
  loadAllAdminData();
}

function showLogin() {
  dashboardSection.classList.add("hidden");
  loginSection.classList.remove("hidden");
}

function handleLoginSubmit(e) {
  e.preventDefault();
  loginError.textContent = "";

  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;

  setButtonLoading(loginSubmitBtn, true, "Memeriksa...", "Masuk");

  setTimeout(() => {
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "true");
      setButtonLoading(loginSubmitBtn, false, "Memeriksa...", "Masuk");
      loginForm.reset();
      showDashboard();
    } else {
      setButtonLoading(loginSubmitBtn, false, "Memeriksa...", "Masuk");
      loginError.textContent = "Username atau password salah.";
    }
  }, 300);
}

function handleLogout() {
  sessionStorage.removeItem(SESSION_KEY);
  showLogin();
}

/* -----------------------------------------------------------
   6. PROFILE: LOAD & SAVE
----------------------------------------------------------- */
async function loadProfile() {
  if (!supabaseClient || !profileTextarea) return;

  try {
    const { data, error } = await supabaseClient
      .from("profile")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    profileTextarea.value = data && data.deskripsi ? data.deskripsi : "";
  } catch (err) {
    console.error("Gagal memuat profile:", err);
    showToast("Gagal memuat data profil.", true);
  }
}

async function saveProfile() {
  if (!supabaseClient) return;

  setButtonLoading(saveProfileBtn, true, "Menyimpan...", "Simpan Profil");

  try {
    const { data: existing, error: fetchErr } = await supabaseClient
      .from("profile")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    let opError = null;

    if (existing && existing.id) {
      const { error } = await supabaseClient
        .from("profile")
        .update({ deskripsi: profileTextarea.value })
        .eq("id", existing.id);
      opError = error;
    } else {
      const { error } = await supabaseClient
        .from("profile")
        .insert([{ deskripsi: profileTextarea.value }]);
      opError = error;
    }

    if (opError) throw opError;

    showToast("Profil berhasil diperbarui.");
  } catch (err) {
    console.error("Gagal menyimpan profile:", err);
    showToast("Gagal menyimpan profil. Coba lagi.", true);
  } finally {
    setButtonLoading(saveProfileBtn, false, "Menyimpan...", "Simpan Profil");
  }
}

/* -----------------------------------------------------------
   7. KEGIATAN: LOAD, INSERT, DELETE
----------------------------------------------------------- */
async function loadKegiatan() {
  if (!supabaseClient || !kegiatanList) return;

  try {
    const { data, error } = await supabaseClient
      .from("kegiatan")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    kegiatanList.innerHTML = "";

    if (!data || data.length === 0) {
      kegiatanList.appendChild(makeEmptyRow("Belum ada kegiatan."));
      return;
    }

    data.forEach((item) => {
      kegiatanList.appendChild(
        makeItemRow({
          title: item.judul || "Tanpa judul",
          subtitle: item.kategori || "",
          onDelete: () => deleteKegiatan(item.id),
        })
      );
    });
  } catch (err) {
    console.error("Gagal memuat kegiatan:", err);
    kegiatanList.innerHTML = "";
    kegiatanList.appendChild(makeEmptyRow("Gagal memuat data kegiatan."));
  }
}

async function addKegiatan(e) {
  e.preventDefault();
  if (!supabaseClient) return;

  const judul = kegiatanJudul.value.trim();
  if (!judul) {
    showToast("Judul kegiatan wajib diisi.", true);
    return;
  }

  setButtonLoading(kegiatanSubmitBtn, true, "Menyimpan...", "Tambah Kegiatan");

  try {
    const { error } = await supabaseClient.from("kegiatan").insert([
      {
        judul,
        kategori: kegiatanKategori.value.trim(),
        deskripsi: kegiatanDeskripsi.value.trim(),
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) throw error;

    kegiatanForm.reset();
    showToast("Kegiatan berhasil ditambahkan.");
    await loadKegiatan();
  } catch (err) {
    console.error("Gagal menambah kegiatan:", err);
    showToast("Gagal menambahkan kegiatan. Coba lagi.", true);
  } finally {
    setButtonLoading(kegiatanSubmitBtn, false, "Menyimpan...", "Tambah Kegiatan");
  }
}

async function deleteKegiatan(id) {
  if (!supabaseClient || id === undefined) return;
  if (!confirm("Yakin ingin menghapus kegiatan ini?")) return;

  try {
    const { error } = await supabaseClient.from("kegiatan").delete().eq("id", id);
    if (error) throw error;

    showToast("Kegiatan berhasil dihapus.");
    await loadKegiatan();
  } catch (err) {
    console.error("Gagal menghapus kegiatan:", err);
    showToast("Gagal menghapus kegiatan.", true);
  }
}

/* -----------------------------------------------------------
   8. PRESTASI: LOAD, INSERT, DELETE
----------------------------------------------------------- */
async function loadPrestasi() {
  if (!supabaseClient || !prestasiList) return;

  try {
    const { data, error } = await supabaseClient
      .from("prestasi")
      .select("*")
      .order("tahun", { ascending: false });

    if (error) throw error;

    prestasiList.innerHTML = "";

    if (!data || data.length === 0) {
      prestasiList.appendChild(makeEmptyRow("Belum ada prestasi."));
      return;
    }

    data.forEach((item) => {
      prestasiList.appendChild(
        makeItemRow({
          title: item.nama || "Tanpa nama",
          subtitle: item.tahun || "",
          onDelete: () => deletePrestasi(item.id),
        })
      );
    });
  } catch (err) {
    console.error("Gagal memuat prestasi:", err);
    prestasiList.innerHTML = "";
    prestasiList.appendChild(makeEmptyRow("Gagal memuat data prestasi."));
  }
}

async function addPrestasi(e) {
  e.preventDefault();
  if (!supabaseClient) return;

  const nama = prestasiNama.value.trim();
  const tahun = prestasiTahun.value.trim();

  if (!nama || !tahun) {
    showToast("Nama dan tahun prestasi wajib diisi.", true);
    return;
  }

  setButtonLoading(prestasiSubmitBtn, true, "Menyimpan...", "Tambah Prestasi");

  try {
    const { error } = await supabaseClient.from("prestasi").insert([
      {
        nama,
        tahun,
        deskripsi: prestasiDeskripsi.value.trim(),
      },
    ]);

    if (error) throw error;

    prestasiForm.reset();
    showToast("Prestasi berhasil ditambahkan.");
    await loadPrestasi();
  } catch (err) {
    console.error("Gagal menambah prestasi:", err);
    showToast("Gagal menambahkan prestasi. Coba lagi.", true);
  } finally {
    setButtonLoading(prestasiSubmitBtn, false, "Menyimpan...", "Tambah Prestasi");
  }
}

async function deletePrestasi(id) {
  if (!supabaseClient || id === undefined) return;
  if (!confirm("Yakin ingin menghapus prestasi ini?")) return;

  try {
    const { error } = await supabaseClient.from("prestasi").delete().eq("id", id);
    if (error) throw error;

    showToast("Prestasi berhasil dihapus.");
    await loadPrestasi();
  } catch (err) {
    console.error("Gagal menghapus prestasi:", err);
    showToast("Gagal menghapus prestasi.", true);
  }
}

/* -----------------------------------------------------------
   9. SOSMED: LOAD & SAVE
----------------------------------------------------------- */
async function loadSosmed() {
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient
      .from("sosmed")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    sosmedTiktok.value = data && data.tiktok ? data.tiktok : "";
    sosmedInstagram.value = data && data.instagram ? data.instagram : "";
    sosmedEmail.value = data && data.email ? data.email : "";
  } catch (err) {
    console.error("Gagal memuat sosmed:", err);
    showToast("Gagal memuat data sosmed.", true);
  }
}

async function saveSosmed(e) {
  e.preventDefault();
  if (!supabaseClient) return;

  setButtonLoading(sosmedSubmitBtn, true, "Menyimpan...", "Simpan Sosmed");

  try {
    const { data: existing, error: fetchErr } = await supabaseClient
      .from("sosmed")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    const payload = {
      tiktok: sosmedTiktok.value.trim(),
      instagram: sosmedInstagram.value.trim(),
      email: sosmedEmail.value.trim(),
    };

    let opError = null;

    if (existing && existing.id) {
      const { error } = await supabaseClient.from("sosmed").update(payload).eq("id", existing.id);
      opError = error;
    } else {
      const { error } = await supabaseClient.from("sosmed").insert([payload]);
      opError = error;
    }

    if (opError) throw opError;

    showToast("Tautan sosmed berhasil diperbarui.");
  } catch (err) {
    console.error("Gagal menyimpan sosmed:", err);
    showToast("Gagal menyimpan tautan sosmed. Coba lagi.", true);
  } finally {
    setButtonLoading(sosmedSubmitBtn, false, "Menyimpan...", "Simpan Sosmed");
  }
}

/* -----------------------------------------------------------
   10. HELPER: ITEM ROW UI (Kegiatan / Prestasi list)
----------------------------------------------------------- */
function makeItemRow({ title, subtitle, onDelete }) {
  const row = document.createElement("div");
  row.className = "admin-item-row";

  const info = document.createElement("div");
  info.className = "item-info";

  const titleEl = document.createElement("p");
  titleEl.className = "item-title";
  titleEl.textContent = escapeText(title);

  const subEl = document.createElement("p");
  subEl.className = "item-sub";
  subEl.textContent = escapeText(subtitle);

  info.append(titleEl, subEl);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "btn-delete";
  deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Hapus';
  deleteBtn.addEventListener("click", onDelete);

  row.append(info, deleteBtn);
  return row;
}

function makeEmptyRow(message) {
  const p = document.createElement("p");
  p.className = "empty-text";
  p.textContent = message;
  return p;
}

/* -----------------------------------------------------------
   11. LOAD SEMUA DATA DASHBOARD
----------------------------------------------------------- */
async function loadAllAdminData() {
  await Promise.all([loadProfile(), loadKegiatan(), loadPrestasi(), loadSosmed()]);
}

/* -----------------------------------------------------------
   12. EVENT LISTENERS & INIT
----------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  if (isLoggedIn()) {
    showDashboard();
  } else {
    showLogin();
  }

  loginForm.addEventListener("submit", handleLoginSubmit);
  logoutBtn.addEventListener("click", handleLogout);

  saveProfileBtn.addEventListener("click", saveProfile);
  kegiatanForm.addEventListener("submit", addKegiatan);
  prestasiForm.addEventListener("submit", addPrestasi);
  sosmedForm.addEventListener("submit", saveSosmed);
});
