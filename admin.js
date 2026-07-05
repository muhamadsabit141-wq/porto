/* =========================================================
   RAJA SUBHAN ALPARIZ — PORTFOLIO
   admin.js — Login guard, CRUD, and media upload logic
   ========================================================= */

/* -----------------------------------------------------------
   1. KONFIGURASI SUPABASE
   PENTING: Samakan nilai ini dengan yang ada di script.js
----------------------------------------------------------- */
const SUPABASE_URL = "https://kpvbbostervhfyhcnojo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwdmJib3N0ZXJ2aGZ5aGNub2pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMzU4NTYsImV4cCI6MjA5ODgxMTg1Nn0.RgpZVgIv1L-UR3MXjoIwRKr6Qx_GkHuvbxiXWfVnSuw";

/* Nama bucket Supabase Storage tempat semua file diunggah.
   Bucket ini harus dibuat manual di dashboard Supabase
   (Storage > New bucket) dan diset sebagai "Public bucket". */
const STORAGE_BUCKET = "portfolio-media";

/* Batas ukuran file (dalam byte) */
const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB

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
const profilePhotoInput = document.getElementById("profile-photo-input");
const profilePhotoPreview = document.getElementById("profile-photo-preview");
const profilePhotoPlaceholder = document.getElementById("profile-photo-placeholder");

const kegiatanList = document.getElementById("kegiatan-list");
const kegiatanForm = document.getElementById("kegiatan-form");
const kegiatanEditId = document.getElementById("kegiatan-edit-id");
const kegiatanJudul = document.getElementById("kegiatan-judul");
const kegiatanKategori = document.getElementById("kegiatan-kategori");
const kegiatanDeskripsi = document.getElementById("kegiatan-deskripsi");
const kegiatanSubmitBtn = document.getElementById("kegiatan-submit-btn");
const kegiatanCancelBtn = document.getElementById("kegiatan-cancel-btn");
const kegiatanMediaInput = document.getElementById("kegiatan-media-input");
const kegiatanMediaPreviewImg = document.getElementById("kegiatan-media-preview-img");
const kegiatanMediaPreviewVideo = document.getElementById("kegiatan-media-preview-video");
const kegiatanMediaPlaceholder = document.getElementById("kegiatan-media-placeholder");
const kegiatanMediaRemoveBtn = document.getElementById("kegiatan-media-remove-btn");

const prestasiList = document.getElementById("prestasi-list");
const prestasiForm = document.getElementById("prestasi-form");
const prestasiEditId = document.getElementById("prestasi-edit-id");
const prestasiNama = document.getElementById("prestasi-nama");
const prestasiTahun = document.getElementById("prestasi-tahun");
const prestasiDeskripsi = document.getElementById("prestasi-deskripsi");
const prestasiSubmitBtn = document.getElementById("prestasi-submit-btn");
const prestasiCancelBtn = document.getElementById("prestasi-cancel-btn");
const prestasiMediaInput = document.getElementById("prestasi-media-input");
const prestasiMediaPreviewImg = document.getElementById("prestasi-media-preview-img");
const prestasiMediaPreviewVideo = document.getElementById("prestasi-media-preview-video");
const prestasiMediaPlaceholder = document.getElementById("prestasi-media-placeholder");
const prestasiMediaRemoveBtn = document.getElementById("prestasi-media-remove-btn");

const sosmedForm = document.getElementById("sosmed-form");
const sosmedTiktok = document.getElementById("sosmed-tiktok");
const sosmedInstagram = document.getElementById("sosmed-instagram");
const sosmedEmail = document.getElementById("sosmed-email");
const sosmedSubmitBtn = document.getElementById("sosmed-submit-btn");
const sosmedFileInput = document.getElementById("sosmed-file-input");
const sosmedFileCurrent = document.getElementById("sosmed-file-current");
const sosmedFileSelectedHint = document.getElementById("sosmed-file-selected-hint");

/* -----------------------------------------------------------
   4. STATE: file yang dipilih tapi belum diunggah + mode edit
----------------------------------------------------------- */
const state = {
  profilePhotoFile: null,
  profileExistingId: null,
  profileExistingFotoUrl: "",

  kegiatanEditingId: null,
  kegiatanMediaFile: null,
  kegiatanRemoveMedia: false,
  kegiatanExistingMediaUrl: "",
  kegiatanExistingMediaType: "",

  prestasiEditingId: null,
  prestasiMediaFile: null,
  prestasiRemoveMedia: false,
  prestasiExistingMediaUrl: "",
  prestasiExistingMediaType: "",

  sosmedExistingId: null,
  sosmedFile: null,
  sosmedRemoveFile: false,
  sosmedExistingFileUrl: "",
};

/* -----------------------------------------------------------
   5. UTILITAS: TOAST NOTIFIKASI
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

function getFileNameFromUrl(url) {
  try {
    const clean = url.split("?")[0];
    const parts = clean.split("/");
    return decodeURIComponent(parts[parts.length - 1]);
  } catch (e) {
    return "file";
  }
}

/* -----------------------------------------------------------
   6. UPLOAD KE SUPABASE STORAGE
----------------------------------------------------------- */
async function uploadFileToStorage(file, folder) {
  if (!supabaseClient) throw new Error("Supabase belum terhubung.");

  const safeExt = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const uniqueName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(STORAGE_BUCKET)
    .upload(uniqueName, file, { cacheControl: "3600", upsert: false });

  if (uploadError) throw uploadError;

  const { data: publicData } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(uniqueName);

  if (!publicData || !publicData.publicUrl) {
    throw new Error("Gagal mendapatkan URL publik file.");
  }

  return publicData.publicUrl;
}

function validateFile(file, kind) {
  if (kind === "image" && file.size > MAX_IMAGE_SIZE) {
    return "Ukuran gambar melebihi batas 8MB.";
  }
  if (kind === "video" && file.size > MAX_VIDEO_SIZE) {
    return "Ukuran video melebihi batas 50MB.";
  }
  if (kind === "doc" && file.size > MAX_DOC_SIZE) {
    return "Ukuran file melebihi batas 10MB.";
  }
  return null;
}

/* -----------------------------------------------------------
   7. PROTEKSI LOGIN
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
   8. PROFILE: LOAD, PREVIEW FOTO, & SAVE
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
    state.profileExistingId = data && data.id ? data.id : null;
    state.profileExistingFotoUrl = data && data.foto_url ? data.foto_url : "";

    updateProfilePhotoPreview(state.profileExistingFotoUrl);
  } catch (err) {
    console.error("Gagal memuat profile:", err);
    showToast("Gagal memuat data profil.", true);
  }
}

function updateProfilePhotoPreview(url) {
  if (url) {
    profilePhotoPreview.src = url;
    profilePhotoPreview.classList.remove("hidden");
    profilePhotoPlaceholder.classList.add("hidden");
  } else {
    profilePhotoPreview.classList.add("hidden");
    profilePhotoPlaceholder.classList.remove("hidden");
  }
}

function handleProfilePhotoInputChange() {
  const file = profilePhotoInput.files && profilePhotoInput.files[0];
  if (!file) return;

  const validationError = validateFile(file, "image");
  if (validationError) {
    showToast(validationError, true);
    profilePhotoInput.value = "";
    return;
  }

  state.profilePhotoFile = file;
  const localUrl = URL.createObjectURL(file);
  updateProfilePhotoPreview(localUrl);
}

async function saveProfile() {
  if (!supabaseClient) return;

  setButtonLoading(saveProfileBtn, true, "Menyimpan...", "Simpan Profil");

  try {
    let fotoUrl = state.profileExistingFotoUrl;

    if (state.profilePhotoFile) {
      fotoUrl = await uploadFileToStorage(state.profilePhotoFile, "profile");
    }

    const payload = { deskripsi: profileTextarea.value, foto_url: fotoUrl };

    let opError = null;

    if (state.profileExistingId) {
      const { error } = await supabaseClient.from("profile").update(payload).eq("id", state.profileExistingId);
      opError = error;
    } else {
      const { data: inserted, error } = await supabaseClient.from("profile").insert([payload]).select().maybeSingle();
      opError = error;
      if (inserted && inserted.id) state.profileExistingId = inserted.id;
    }

    if (opError) throw opError;

    state.profilePhotoFile = null;
    state.profileExistingFotoUrl = fotoUrl;
    profilePhotoInput.value = "";

    showToast("Profil berhasil diperbarui.");
  } catch (err) {
    console.error("Gagal menyimpan profile:", err);
    showToast("Gagal menyimpan profil. Coba lagi.", true);
  } finally {
    setButtonLoading(saveProfileBtn, false, "Menyimpan...", "Simpan Profil");
  }
}

/* -----------------------------------------------------------
   9. HELPER: PREVIEW MEDIA (Kegiatan / Prestasi — image atau video)
----------------------------------------------------------- */
function showMediaPreview({ url, type, imgEl, videoEl, placeholderEl, removeBtnEl }) {
  imgEl.classList.add("hidden");
  videoEl.classList.add("hidden");
  imgEl.removeAttribute("src");
  videoEl.removeAttribute("src");

  if (!url) {
    placeholderEl.classList.remove("hidden");
    removeBtnEl.classList.add("hidden");
    return;
  }

  placeholderEl.classList.add("hidden");
  removeBtnEl.classList.remove("hidden");

  if (type === "video") {
    videoEl.src = url;
    videoEl.classList.remove("hidden");
  } else {
    imgEl.src = url;
    imgEl.classList.remove("hidden");
  }
}

function resetKegiatanMediaPreview() {
  showMediaPreview({
    url: "",
    type: "",
    imgEl: kegiatanMediaPreviewImg,
    videoEl: kegiatanMediaPreviewVideo,
    placeholderEl: kegiatanMediaPlaceholder,
    removeBtnEl: kegiatanMediaRemoveBtn,
  });
}

function resetPrestasiMediaPreview() {
  showMediaPreview({
    url: "",
    type: "",
    imgEl: prestasiMediaPreviewImg,
    videoEl: prestasiMediaPreviewVideo,
    placeholderEl: prestasiMediaPlaceholder,
    removeBtnEl: prestasiMediaRemoveBtn,
  });
}

function handleKegiatanMediaInputChange() {
  const file = kegiatanMediaInput.files && kegiatanMediaInput.files[0];
  if (!file) return;

  const isVideo = file.type.startsWith("video/");
  const validationError = validateFile(file, isVideo ? "video" : "image");
  if (validationError) {
    showToast(validationError, true);
    kegiatanMediaInput.value = "";
    return;
  }

  state.kegiatanMediaFile = file;
  state.kegiatanRemoveMedia = false;
  const localUrl = URL.createObjectURL(file);
  showMediaPreview({
    url: localUrl,
    type: isVideo ? "video" : "image",
    imgEl: kegiatanMediaPreviewImg,
    videoEl: kegiatanMediaPreviewVideo,
    placeholderEl: kegiatanMediaPlaceholder,
    removeBtnEl: kegiatanMediaRemoveBtn,
  });
}

function handlePrestasiMediaInputChange() {
  const file = prestasiMediaInput.files && prestasiMediaInput.files[0];
  if (!file) return;

  const isVideo = file.type.startsWith("video/");
  const validationError = validateFile(file, isVideo ? "video" : "image");
  if (validationError) {
    showToast(validationError, true);
    prestasiMediaInput.value = "";
    return;
  }

  state.prestasiMediaFile = file;
  state.prestasiRemoveMedia = false;
  const localUrl = URL.createObjectURL(file);
  showMediaPreview({
    url: localUrl,
    type: isVideo ? "video" : "image",
    imgEl: prestasiMediaPreviewImg,
    videoEl: prestasiMediaPreviewVideo,
    placeholderEl: prestasiMediaPlaceholder,
    removeBtnEl: prestasiMediaRemoveBtn,
  });
}

function handleKegiatanMediaRemoveClick() {
  state.kegiatanMediaFile = null;
  state.kegiatanRemoveMedia = true;
  kegiatanMediaInput.value = "";
  resetKegiatanMediaPreview();
}

function handlePrestasiMediaRemoveClick() {
  state.prestasiMediaFile = null;
  state.prestasiRemoveMedia = true;
  prestasiMediaInput.value = "";
  resetPrestasiMediaPreview();
}

/* -----------------------------------------------------------
   10. KEGIATAN: LOAD, TAMBAH/UPDATE, HAPUS, EDIT
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
          hasMedia: Boolean(item.media_url),
          onEdit: () => startEditKegiatan(item),
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

function startEditKegiatan(item) {
  state.kegiatanEditingId = item.id;
  state.kegiatanMediaFile = null;
  state.kegiatanRemoveMedia = false;
  state.kegiatanExistingMediaUrl = item.media_url || "";
  state.kegiatanExistingMediaType = item.media_type || "image";

  kegiatanEditId.value = item.id;
  kegiatanJudul.value = item.judul || "";
  kegiatanKategori.value = item.kategori || "";
  kegiatanDeskripsi.value = item.deskripsi || "";
  kegiatanMediaInput.value = "";

  showMediaPreview({
    url: state.kegiatanExistingMediaUrl,
    type: state.kegiatanExistingMediaType,
    imgEl: kegiatanMediaPreviewImg,
    videoEl: kegiatanMediaPreviewVideo,
    placeholderEl: kegiatanMediaPlaceholder,
    removeBtnEl: kegiatanMediaRemoveBtn,
  });

  kegiatanSubmitBtn.textContent = "Update Kegiatan";
  kegiatanCancelBtn.classList.remove("hidden");
  kegiatanForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function cancelEditKegiatan() {
  state.kegiatanEditingId = null;
  state.kegiatanMediaFile = null;
  state.kegiatanRemoveMedia = false;
  state.kegiatanExistingMediaUrl = "";
  state.kegiatanExistingMediaType = "";

  kegiatanForm.reset();
  kegiatanEditId.value = "";
  resetKegiatanMediaPreview();

  kegiatanSubmitBtn.textContent = "Tambah Kegiatan";
  kegiatanCancelBtn.classList.add("hidden");
}

async function submitKegiatan(e) {
  e.preventDefault();
  if (!supabaseClient) return;

  const judul = kegiatanJudul.value.trim();
  if (!judul) {
    showToast("Judul kegiatan wajib diisi.", true);
    return;
  }

  const isEditing = Boolean(state.kegiatanEditingId);
  setButtonLoading(kegiatanSubmitBtn, true, "Menyimpan...", isEditing ? "Update Kegiatan" : "Tambah Kegiatan");

  try {
    let mediaUrl = state.kegiatanExistingMediaUrl;
    let mediaType = state.kegiatanExistingMediaType;

    if (state.kegiatanMediaFile) {
      mediaUrl = await uploadFileToStorage(state.kegiatanMediaFile, "kegiatan");
      mediaType = state.kegiatanMediaFile.type.startsWith("video/") ? "video" : "image";
    } else if (state.kegiatanRemoveMedia) {
      mediaUrl = "";
      mediaType = "";
    }

    const payload = {
      judul,
      kategori: kegiatanKategori.value.trim(),
      deskripsi: kegiatanDeskripsi.value.trim(),
      media_url: mediaUrl || null,
      media_type: mediaType || null,
    };

    let opError = null;

    if (isEditing) {
      const { error } = await supabaseClient.from("kegiatan").update(payload).eq("id", state.kegiatanEditingId);
      opError = error;
    } else {
      payload.created_at = new Date().toISOString();
      const { error } = await supabaseClient.from("kegiatan").insert([payload]);
      opError = error;
    }

    if (opError) throw opError;

    showToast(isEditing ? "Kegiatan berhasil diperbarui." : "Kegiatan berhasil ditambahkan.");
    cancelEditKegiatan();
    await loadKegiatan();
  } catch (err) {
    console.error("Gagal menyimpan kegiatan:", err);
    showToast("Gagal menyimpan kegiatan. Coba lagi.", true);
  } finally {
    setButtonLoading(kegiatanSubmitBtn, false, "Menyimpan...", isEditing ? "Update Kegiatan" : "Tambah Kegiatan");
  }
}

async function deleteKegiatan(id) {
  if (!supabaseClient || id === undefined) return;
  if (!confirm("Yakin ingin menghapus kegiatan ini?")) return;

  try {
    const { error } = await supabaseClient.from("kegiatan").delete().eq("id", id);
    if (error) throw error;

    if (state.kegiatanEditingId === id) cancelEditKegiatan();

    showToast("Kegiatan berhasil dihapus.");
    await loadKegiatan();
  } catch (err) {
    console.error("Gagal menghapus kegiatan:", err);
    showToast("Gagal menghapus kegiatan.", true);
  }
}

/* -----------------------------------------------------------
   11. PRESTASI: LOAD, TAMBAH/UPDATE, HAPUS, EDIT
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
          hasMedia: Boolean(item.media_url),
          onEdit: () => startEditPrestasi(item),
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

function startEditPrestasi(item) {
  state.prestasiEditingId = item.id;
  state.prestasiMediaFile = null;
  state.prestasiRemoveMedia = false;
  state.prestasiExistingMediaUrl = item.media_url || "";
  state.prestasiExistingMediaType = item.media_type || "image";

  prestasiEditId.value = item.id;
  prestasiNama.value = item.nama || "";
  prestasiTahun.value = item.tahun || "";
  prestasiDeskripsi.value = item.deskripsi || "";
  prestasiMediaInput.value = "";

  showMediaPreview({
    url: state.prestasiExistingMediaUrl,
    type: state.prestasiExistingMediaType,
    imgEl: prestasiMediaPreviewImg,
    videoEl: prestasiMediaPreviewVideo,
    placeholderEl: prestasiMediaPlaceholder,
    removeBtnEl: prestasiMediaRemoveBtn,
  });

  prestasiSubmitBtn.textContent = "Update Prestasi";
  prestasiCancelBtn.classList.remove("hidden");
  prestasiForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function cancelEditPrestasi() {
  state.prestasiEditingId = null;
  state.prestasiMediaFile = null;
  state.prestasiRemoveMedia = false;
  state.prestasiExistingMediaUrl = "";
  state.prestasiExistingMediaType = "";

  prestasiForm.reset();
  prestasiEditId.value = "";
  resetPrestasiMediaPreview();

  prestasiSubmitBtn.textContent = "Tambah Prestasi";
  prestasiCancelBtn.classList.add("hidden");
}

async function submitPrestasi(e) {
  e.preventDefault();
  if (!supabaseClient) return;

  const nama = prestasiNama.value.trim();
  const tahun = prestasiTahun.value.trim();

  if (!nama || !tahun) {
    showToast("Nama dan tahun prestasi wajib diisi.", true);
    return;
  }

  const isEditing = Boolean(state.prestasiEditingId);
  setButtonLoading(prestasiSubmitBtn, true, "Menyimpan...", isEditing ? "Update Prestasi" : "Tambah Prestasi");

  try {
    let mediaUrl = state.prestasiExistingMediaUrl;
    let mediaType = state.prestasiExistingMediaType;

    if (state.prestasiMediaFile) {
      mediaUrl = await uploadFileToStorage(state.prestasiMediaFile, "prestasi");
      mediaType = state.prestasiMediaFile.type.startsWith("video/") ? "video" : "image";
    } else if (state.prestasiRemoveMedia) {
      mediaUrl = "";
      mediaType = "";
    }

    const payload = {
      nama,
      tahun,
      deskripsi: prestasiDeskripsi.value.trim(),
      media_url: mediaUrl || null,
      media_type: mediaType || null,
    };

    let opError = null;

    if (isEditing) {
      const { error } = await supabaseClient.from("prestasi").update(payload).eq("id", state.prestasiEditingId);
      opError = error;
    } else {
      const { error } = await supabaseClient.from("prestasi").insert([payload]);
      opError = error;
    }

    if (opError) throw opError;

    showToast(isEditing ? "Prestasi berhasil diperbarui." : "Prestasi berhasil ditambahkan.");
    cancelEditPrestasi();
    await loadPrestasi();
  } catch (err) {
    console.error("Gagal menyimpan prestasi:", err);
    showToast("Gagal menyimpan prestasi. Coba lagi.", true);
  } finally {
    setButtonLoading(prestasiSubmitBtn, false, "Menyimpan...", isEditing ? "Update Prestasi" : "Tambah Prestasi");
  }
}

async function deletePrestasi(id) {
  if (!supabaseClient || id === undefined) return;
  if (!confirm("Yakin ingin menghapus prestasi ini?")) return;

  try {
    const { error } = await supabaseClient.from("prestasi").delete().eq("id", id);
    if (error) throw error;

    if (state.prestasiEditingId === id) cancelEditPrestasi();

    showToast("Prestasi berhasil dihapus.");
    await loadPrestasi();
  } catch (err) {
    console.error("Gagal menghapus prestasi:", err);
    showToast("Gagal menghapus prestasi.", true);
  }
}

/* -----------------------------------------------------------
   12. SOSMED: LOAD & SAVE (termasuk file tambahan/CV)
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

    state.sosmedExistingId = data && data.id ? data.id : null;
    state.sosmedExistingFileUrl = data && data.file_url ? data.file_url : "";

    renderSosmedFileCurrent();
  } catch (err) {
    console.error("Gagal memuat sosmed:", err);
    showToast("Gagal memuat data sosmed.", true);
  }
}

function renderSosmedFileCurrent() {
  sosmedFileCurrent.innerHTML = "";

  if (!state.sosmedExistingFileUrl) {
    const span = document.createElement("span");
    span.className = "empty-text file-empty-inline";
    span.id = "sosmed-file-empty-text";
    span.textContent = "Belum ada file diunggah.";
    sosmedFileCurrent.appendChild(span);
    return;
  }

  const link = document.createElement("a");
  link.href = state.sosmedExistingFileUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.className = "file-current-link";
  link.innerHTML = `<i class="fa-solid fa-file-lines"></i> ${escapeText(getFileNameFromUrl(state.sosmedExistingFileUrl))}`;

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "btn-delete file-current-remove";
  removeBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
  removeBtn.addEventListener("click", () => {
    state.sosmedRemoveFile = true;
    state.sosmedExistingFileUrl = "";
    renderSosmedFileCurrent();
  });

  sosmedFileCurrent.append(link, removeBtn);
}

function handleSosmedFileInputChange() {
  const file = sosmedFileInput.files && sosmedFileInput.files[0];
  if (!file) return;

  const validationError = validateFile(file, "doc");
  if (validationError) {
    showToast(validationError, true);
    sosmedFileInput.value = "";
    return;
  }

  state.sosmedFile = file;
  state.sosmedRemoveFile = false;
  sosmedFileSelectedHint.textContent = `File dipilih: ${file.name}`;
}

async function saveSosmed(e) {
  e.preventDefault();
  if (!supabaseClient) return;

  setButtonLoading(sosmedSubmitBtn, true, "Menyimpan...", "Simpan Sosmed");

  try {
    let fileUrl = state.sosmedExistingFileUrl;

    if (state.sosmedFile) {
      fileUrl = await uploadFileToStorage(state.sosmedFile, "dokumen");
    } else if (state.sosmedRemoveFile) {
      fileUrl = "";
    }

    const payload = {
      tiktok: sosmedTiktok.value.trim(),
      instagram: sosmedInstagram.value.trim(),
      email: sosmedEmail.value.trim(),
      file_url: fileUrl || null,
    };

    let opError = null;

    if (state.sosmedExistingId) {
      const { error } = await supabaseClient.from("sosmed").update(payload).eq("id", state.sosmedExistingId);
      opError = error;
    } else {
      const { data: inserted, error } = await supabaseClient.from("sosmed").insert([payload]).select().maybeSingle();
      opError = error;
      if (inserted && inserted.id) state.sosmedExistingId = inserted.id;
    }

    if (opError) throw opError;

    state.sosmedFile = null;
    state.sosmedRemoveFile = false;
    state.sosmedExistingFileUrl = fileUrl;
    sosmedFileInput.value = "";
    sosmedFileSelectedHint.textContent = "";
    renderSosmedFileCurrent();

    showToast("Tautan sosmed berhasil diperbarui.");
  } catch (err) {
    console.error("Gagal menyimpan sosmed:", err);
    showToast("Gagal menyimpan tautan sosmed. Coba lagi.", true);
  } finally {
    setButtonLoading(sosmedSubmitBtn, false, "Menyimpan...", "Simpan Sosmed");
  }
}

/* -----------------------------------------------------------
   13. HELPER: ITEM ROW UI (Kegiatan / Prestasi list)
----------------------------------------------------------- */
function makeItemRow({ title, subtitle, hasMedia, onEdit, onDelete }) {
  const row = document.createElement("div");
  row.className = "admin-item-row";

  const info = document.createElement("div");
  info.className = "item-info";

  const titleEl = document.createElement("p");
  titleEl.className = "item-title";
  titleEl.textContent = escapeText(title);
  if (hasMedia) {
    const mediaTag = document.createElement("span");
    mediaTag.className = "item-media-tag";
    mediaTag.innerHTML = '<i class="fa-solid fa-photo-film"></i>';
    titleEl.appendChild(mediaTag);
  }

  const subEl = document.createElement("p");
  subEl.className = "item-sub";
  subEl.textContent = escapeText(subtitle);

  info.append(titleEl, subEl);

  const actions = document.createElement("div");
  actions.className = "item-actions";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "btn-edit-item";
  editBtn.innerHTML = '<i class="fa-solid fa-pen"></i> Edit';
  editBtn.addEventListener("click", onEdit);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "btn-delete";
  deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Hapus';
  deleteBtn.addEventListener("click", onDelete);

  actions.append(editBtn, deleteBtn);
  row.append(info, actions);
  return row;
}

function makeEmptyRow(message) {
  const p = document.createElement("p");
  p.className = "empty-text";
  p.textContent = message;
  return p;
}

/* -----------------------------------------------------------
   14. LOAD SEMUA DATA DASHBOARD
----------------------------------------------------------- */
async function loadAllAdminData() {
  await Promise.all([loadProfile(), loadKegiatan(), loadPrestasi(), loadSosmed()]);
}

/* -----------------------------------------------------------
   15. EVENT LISTENERS & INIT
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
  profilePhotoInput.addEventListener("change", handleProfilePhotoInputChange);

  kegiatanForm.addEventListener("submit", submitKegiatan);
  kegiatanCancelBtn.addEventListener("click", cancelEditKegiatan);
  kegiatanMediaInput.addEventListener("change", handleKegiatanMediaInputChange);
  kegiatanMediaRemoveBtn.addEventListener("click", handleKegiatanMediaRemoveClick);

  prestasiForm.addEventListener("submit", submitPrestasi);
  prestasiCancelBtn.addEventListener("click", cancelEditPrestasi);
  prestasiMediaInput.addEventListener("change", handlePrestasiMediaInputChange);
  prestasiMediaRemoveBtn.addEventListener("click", handlePrestasiMediaRemoveClick);

  sosmedForm.addEventListener("submit", saveSosmed);
  sosmedFileInput.addEventListener("change", handleSosmedFileInputChange);
});
