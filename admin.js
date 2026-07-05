/* =========================================================
   RAJA SUBHAN ALPARIZ — PORTFOLIO v2
   admin.js — Supabase Auth login, tabbed CRUD, reorder, galeri
   ========================================================= */

/* -----------------------------------------------------------
   1. KONFIGURASI SUPABASE
----------------------------------------------------------- */
const SUPABASE_URL = "https://kpvbbostervhfyhcnojo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwdmJib3N0ZXJ2aGZ5aGNub2pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMzU4NTYsImV4cCI6MjA5ODgxMTg1Nn0.RgpZVgIv1L-UR3MXjoIwRKr6Qx_GkHuvbxiXWfVnSuw";

const STORAGE_BUCKET = "portfolio-media";
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const MAX_DOC_SIZE = 10 * 1024 * 1024;

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
   2. ELEMEN DOM — LOGIN & SHELL
----------------------------------------------------------- */
const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const loginSubmitBtn = document.getElementById("login-submit-btn");
const logoutBtn = document.getElementById("logout-btn");
const adminSessionEmail = document.getElementById("admin-session-email");

/* -----------------------------------------------------------
   3. STATE GLOBAL
----------------------------------------------------------- */
const state = {
  profileExistingId: null,
  profileExistingFotoUrl: "",
  profilePhotoFile: null,

  pendidikanItems: [],
  pendidikanEditingId: null,

  organisasiItems: [],
  organisasiEditingId: null,
  organisasiLogoFile: null,
  organisasiRemoveLogo: false,
  organisasiExistingLogoUrl: "",

  kegiatanItems: [],
  kegiatanEditingId: null,
  kegiatanGalleryExisting: [],
  kegiatanGalleryNewFiles: [],
  kegiatanGalleryRemovedIds: [],

  prestasiItems: [],
  prestasiEditingId: null,
  prestasiGalleryExisting: [],
  prestasiGalleryNewFiles: [],
  prestasiGalleryRemovedIds: [],

  sosmedExistingId: null,
  sosmedExistingFileUrl: "",
  sosmedFile: null,
  sosmedRemoveFile: false,
};

/* -----------------------------------------------------------
   4. UTILITAS UMUM
----------------------------------------------------------- */
function showToast(message, isError = false) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "toast" + (isError ? " toast-error" : "");
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
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

function validateFile(file, kind) {
  if (kind === "image" && file.size > MAX_IMAGE_SIZE) return "Ukuran gambar melebihi batas 8MB.";
  if (kind === "video" && file.size > MAX_VIDEO_SIZE) return "Ukuran video melebihi batas 50MB.";
  if (kind === "doc" && file.size > MAX_DOC_SIZE) return "Ukuran file melebihi batas 10MB.";
  return null;
}

async function uploadFileToStorage(file, folder) {
  if (!supabaseClient) throw new Error("Supabase belum terhubung.");
  const safeExt = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const uniqueName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(STORAGE_BUCKET)
    .upload(uniqueName, file, { cacheControl: "3600", upsert: false });

  if (uploadError) throw uploadError;

  const { data: publicData } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(uniqueName);
  if (!publicData || !publicData.publicUrl) throw new Error("Gagal mendapatkan URL publik file.");
  return publicData.publicUrl;
}

async function swapUrutan(table, itemA, itemB, reloadFn) {
  try {
    const { error: err1 } = await supabaseClient.from(table).update({ urutan: itemB.urutan }).eq("id", itemA.id);
    if (err1) throw err1;
    const { error: err2 } = await supabaseClient.from(table).update({ urutan: itemA.urutan }).eq("id", itemB.id);
    if (err2) throw err2;
    await reloadFn();
  } catch (err) {
    console.error("Gagal mengubah urutan:", err);
    showToast("Gagal mengubah urutan. Coba lagi.", true);
  }
}

/* -----------------------------------------------------------
   5. HELPER UI: ITEM ROW (dengan reorder)
----------------------------------------------------------- */
function makeItemRow({ title, subtitle, hasMedia, thumbUrl, onEdit, onDelete, onMoveUp, onMoveDown, disableUp, disableDown }) {
  const row = document.createElement("div");
  row.className = "admin-item-row";

  const reorder = document.createElement("div");
  reorder.className = "reorder-controls";

  const upBtn = document.createElement("button");
  upBtn.type = "button";
  upBtn.className = "reorder-btn";
  upBtn.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
  upBtn.disabled = Boolean(disableUp);
  upBtn.addEventListener("click", onMoveUp);

  const downBtn = document.createElement("button");
  downBtn.type = "button";
  downBtn.className = "reorder-btn";
  downBtn.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
  downBtn.disabled = Boolean(disableDown);
  downBtn.addEventListener("click", onMoveDown);

  reorder.append(upBtn, downBtn);

  const thumb = document.createElement("div");
  thumb.className = "item-thumb";
  if (thumbUrl) {
    const img = document.createElement("img");
    img.src = thumbUrl;
    thumb.appendChild(img);
  } else {
    thumb.innerHTML = hasMedia ? '<i class="fa-solid fa-photo-film"></i>' : '<i class="fa-solid fa-file-lines"></i>';
  }

  const info = document.createElement("div");
  info.className = "item-info";

  const titleEl = document.createElement("p");
  titleEl.className = "item-title";
  titleEl.textContent = escapeText(title);
  if (hasMedia) {
    const tag = document.createElement("span");
    tag.className = "item-media-tag";
    tag.innerHTML = '<i class="fa-solid fa-images"></i>';
    titleEl.appendChild(tag);
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
  deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
  deleteBtn.addEventListener("click", onDelete);

  actions.append(editBtn, deleteBtn);
  row.append(reorder, thumb, info, actions);
  return row;
}

function makeEmptyRow(message) {
  const p = document.createElement("p");
  p.className = "empty-text";
  p.textContent = message;
  return p;
}

/* -----------------------------------------------------------
   6. TABS
----------------------------------------------------------- */
function initTabs() {
  document.querySelectorAll(".admin-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".admin-tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.getAttribute("data-tab");
      const panel = document.querySelector(`.admin-tab-panel[data-tab-panel="${tab}"]`);
      if (panel) panel.classList.add("active");
    });
  });
}

/* -----------------------------------------------------------
   7. AUTH (Supabase Auth — bukan hardcoded)
----------------------------------------------------------- */
function showDashboard(session) {
  loginSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
  if (adminSessionEmail && session && session.user) {
    adminSessionEmail.textContent = `Masuk sebagai ${session.user.email}`;
  }
  loadAllAdminData();
}

function showLogin() {
  dashboardSection.classList.add("hidden");
  loginSection.classList.remove("hidden");
}

function translateAuthError(message) {
  if (!message) return "Gagal masuk. Silakan coba lagi.";
  if (message.toLowerCase().includes("invalid login credentials")) return "Email atau password salah.";
  if (message.toLowerCase().includes("email not confirmed")) return "Email belum dikonfirmasi. Cek kotak masuk Anda.";
  return message;
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  loginError.textContent = "";

  if (!supabaseClient) {
    loginError.textContent = "Supabase belum terhubung.";
    return;
  }

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  setButtonLoading(loginSubmitBtn, true, "Memeriksa...", "Masuk");

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;

    loginForm.reset();
    showDashboard(data.session);
  } catch (err) {
    console.error("Gagal login:", err);
    loginError.textContent = translateAuthError(err.message);
  } finally {
    setButtonLoading(loginSubmitBtn, false, "Memeriksa...", "Masuk");
  }
}

async function handleLogout() {
  if (!supabaseClient) return;
  try {
    await supabaseClient.auth.signOut();
  } catch (err) {
    console.error("Gagal logout:", err);
  }
  showLogin();
}

/* -----------------------------------------------------------
   8. PROFIL: LOAD, PREVIEW FOTO, SAVE
----------------------------------------------------------- */
const profileTextarea = document.getElementById("profile-textarea");
const profileNamaInput = document.getElementById("profile-nama");
const profileKampusInput = document.getElementById("profile-kampus");
const profileJurusanInput = document.getElementById("profile-jurusan");
const profileTaglineInput = document.getElementById("profile-tagline");
const saveProfileBtn = document.getElementById("save-profile-btn");
const profilePhotoInput = document.getElementById("profile-photo-input");
const profilePhotoPreview = document.getElementById("profile-photo-preview");
const profilePhotoPlaceholder = document.getElementById("profile-photo-placeholder");

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

async function loadProfile() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient.from("profile").select("*").limit(1).maybeSingle();
    if (error) throw error;

    profileNamaInput.value = data && data.nama ? data.nama : "";
    profileKampusInput.value = data && data.kampus ? data.kampus : "";
    profileJurusanInput.value = data && data.jurusan ? data.jurusan : "";
    profileTaglineInput.value = data && data.tagline ? data.tagline : "";
    profileTextarea.value = data && data.deskripsi ? data.deskripsi : "";

    state.profileExistingId = data && data.id ? data.id : null;
    state.profileExistingFotoUrl = data && data.foto_url ? data.foto_url : "";
    updateProfilePhotoPreview(state.profileExistingFotoUrl);
  } catch (err) {
    console.error("Gagal memuat profile:", err);
    showToast("Gagal memuat data profil.", true);
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
  updateProfilePhotoPreview(URL.createObjectURL(file));
}

async function saveProfile() {
  if (!supabaseClient) return;
  setButtonLoading(saveProfileBtn, true, "Menyimpan...", "Simpan Profil");

  try {
    let fotoUrl = state.profileExistingFotoUrl;
    if (state.profilePhotoFile) {
      fotoUrl = await uploadFileToStorage(state.profilePhotoFile, "profile");
    }

    const payload = {
      nama: profileNamaInput.value.trim(),
      kampus: profileKampusInput.value.trim(),
      jurusan: profileJurusanInput.value.trim(),
      tagline: profileTaglineInput.value.trim(),
      deskripsi: profileTextarea.value,
      foto_url: fotoUrl,
    };

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
   9. PENDIDIKAN: LOAD, CRUD, REORDER
----------------------------------------------------------- */
const pendidikanList = document.getElementById("pendidikan-list");
const pendidikanForm = document.getElementById("pendidikan-form");
const pendidikanEditId = document.getElementById("pendidikan-edit-id");
const pendidikanInstitusi = document.getElementById("pendidikan-institusi");
const pendidikanJenjang = document.getElementById("pendidikan-jenjang");
const pendidikanTahunMulai = document.getElementById("pendidikan-tahun-mulai");
const pendidikanTahunSelesai = document.getElementById("pendidikan-tahun-selesai");
const pendidikanDeskripsi = document.getElementById("pendidikan-deskripsi");
const pendidikanSubmitBtn = document.getElementById("pendidikan-submit-btn");
const pendidikanCancelBtn = document.getElementById("pendidikan-cancel-btn");

async function loadPendidikan() {
  if (!supabaseClient || !pendidikanList) return;
  try {
    const { data, error } = await supabaseClient.from("pendidikan").select("*").order("urutan", { ascending: true });
    if (error) throw error;

    state.pendidikanItems = data || [];
    document.getElementById("admin-stat-pendidikan").textContent = state.pendidikanItems.length;

    pendidikanList.innerHTML = "";
    if (state.pendidikanItems.length === 0) {
      pendidikanList.appendChild(makeEmptyRow("Belum ada riwayat pendidikan."));
      return;
    }

    state.pendidikanItems.forEach((item, index) => {
      pendidikanList.appendChild(
        makeItemRow({
          title: item.institusi || "Tanpa nama",
          subtitle: [item.jenjang, item.tahun_mulai].filter(Boolean).join(" · "),
          hasMedia: false,
          onEdit: () => startEditPendidikan(item),
          onDelete: () => deletePendidikan(item.id),
          onMoveUp: () => swapUrutan("pendidikan", item, state.pendidikanItems[index - 1], loadPendidikan),
          onMoveDown: () => swapUrutan("pendidikan", item, state.pendidikanItems[index + 1], loadPendidikan),
          disableUp: index === 0,
          disableDown: index === state.pendidikanItems.length - 1,
        })
      );
    });
  } catch (err) {
    console.error("Gagal memuat pendidikan:", err);
    pendidikanList.innerHTML = "";
    pendidikanList.appendChild(makeEmptyRow("Gagal memuat data pendidikan."));
  }
}

function startEditPendidikan(item) {
  state.pendidikanEditingId = item.id;
  pendidikanEditId.value = item.id;
  pendidikanInstitusi.value = item.institusi || "";
  pendidikanJenjang.value = item.jenjang || "";
  pendidikanTahunMulai.value = item.tahun_mulai || "";
  pendidikanTahunSelesai.value = item.tahun_selesai || "";
  pendidikanDeskripsi.value = item.deskripsi || "";

  pendidikanSubmitBtn.textContent = "Update Pendidikan";
  pendidikanCancelBtn.classList.remove("hidden");
  pendidikanForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function cancelEditPendidikan() {
  state.pendidikanEditingId = null;
  pendidikanForm.reset();
  pendidikanEditId.value = "";
  pendidikanSubmitBtn.textContent = "Tambah Pendidikan";
  pendidikanCancelBtn.classList.add("hidden");
}

async function submitPendidikan(e) {
  e.preventDefault();
  if (!supabaseClient) return;

  const institusi = pendidikanInstitusi.value.trim();
  if (!institusi) {
    showToast("Nama institusi wajib diisi.", true);
    return;
  }

  const isEditing = Boolean(state.pendidikanEditingId);
  setButtonLoading(pendidikanSubmitBtn, true, "Menyimpan...", isEditing ? "Update Pendidikan" : "Tambah Pendidikan");

  try {
    const payload = {
      institusi,
      jenjang: pendidikanJenjang.value.trim(),
      tahun_mulai: pendidikanTahunMulai.value.trim(),
      tahun_selesai: pendidikanTahunSelesai.value.trim(),
      deskripsi: pendidikanDeskripsi.value.trim(),
    };

    let opError = null;
    if (isEditing) {
      const { error } = await supabaseClient.from("pendidikan").update(payload).eq("id", state.pendidikanEditingId);
      opError = error;
    } else {
      payload.urutan = state.pendidikanItems.length;
      const { error } = await supabaseClient.from("pendidikan").insert([payload]);
      opError = error;
    }

    if (opError) throw opError;

    showToast(isEditing ? "Pendidikan berhasil diperbarui." : "Pendidikan berhasil ditambahkan.");
    cancelEditPendidikan();
    await loadPendidikan();
  } catch (err) {
    console.error("Gagal menyimpan pendidikan:", err);
    showToast("Gagal menyimpan data pendidikan.", true);
  } finally {
    setButtonLoading(pendidikanSubmitBtn, false, "Menyimpan...", isEditing ? "Update Pendidikan" : "Tambah Pendidikan");
  }
}

async function deletePendidikan(id) {
  if (!supabaseClient) return;
  if (!confirm("Yakin ingin menghapus riwayat pendidikan ini?")) return;
  try {
    const { error } = await supabaseClient.from("pendidikan").delete().eq("id", id);
    if (error) throw error;
    if (state.pendidikanEditingId === id) cancelEditPendidikan();
    showToast("Data pendidikan berhasil dihapus.");
    await loadPendidikan();
  } catch (err) {
    console.error("Gagal menghapus pendidikan:", err);
    showToast("Gagal menghapus data pendidikan.", true);
  }
}

/* -----------------------------------------------------------
   10. ORGANISASI: LOAD, CRUD, REORDER, LOGO UPLOAD
----------------------------------------------------------- */
const organisasiList = document.getElementById("organisasi-list");
const organisasiForm = document.getElementById("organisasi-form");
const organisasiEditId = document.getElementById("organisasi-edit-id");
const organisasiNama = document.getElementById("organisasi-nama");
const organisasiJabatan = document.getElementById("organisasi-jabatan");
const organisasiPeriode = document.getElementById("organisasi-periode");
const organisasiDeskripsi = document.getElementById("organisasi-deskripsi");
const organisasiSubmitBtn = document.getElementById("organisasi-submit-btn");
const organisasiCancelBtn = document.getElementById("organisasi-cancel-btn");
const organisasiLogoInput = document.getElementById("organisasi-logo-input");
const organisasiLogoPreviewImg = document.getElementById("organisasi-logo-preview-img");
const organisasiLogoPlaceholder = document.getElementById("organisasi-logo-placeholder");
const organisasiLogoRemoveBtn = document.getElementById("organisasi-logo-remove-btn");

function updateOrganisasiLogoPreview(url) {
  if (url) {
    organisasiLogoPreviewImg.src = url;
    organisasiLogoPreviewImg.classList.remove("hidden");
    organisasiLogoPlaceholder.classList.add("hidden");
    organisasiLogoRemoveBtn.classList.remove("hidden");
  } else {
    organisasiLogoPreviewImg.classList.add("hidden");
    organisasiLogoPlaceholder.classList.remove("hidden");
    organisasiLogoRemoveBtn.classList.add("hidden");
  }
}

function handleOrganisasiLogoInputChange() {
  const file = organisasiLogoInput.files && organisasiLogoInput.files[0];
  if (!file) return;
  const validationError = validateFile(file, "image");
  if (validationError) {
    showToast(validationError, true);
    organisasiLogoInput.value = "";
    return;
  }
  state.organisasiLogoFile = file;
  state.organisasiRemoveLogo = false;
  updateOrganisasiLogoPreview(URL.createObjectURL(file));
}

function handleOrganisasiLogoRemoveClick() {
  state.organisasiLogoFile = null;
  state.organisasiRemoveLogo = true;
  organisasiLogoInput.value = "";
  updateOrganisasiLogoPreview("");
}

async function loadOrganisasi() {
  if (!supabaseClient || !organisasiList) return;
  try {
    const { data, error } = await supabaseClient.from("organisasi").select("*").order("urutan", { ascending: true });
    if (error) throw error;

    state.organisasiItems = data || [];
    document.getElementById("admin-stat-organisasi").textContent = state.organisasiItems.length;

    organisasiList.innerHTML = "";
    if (state.organisasiItems.length === 0) {
      organisasiList.appendChild(makeEmptyRow("Belum ada data organisasi."));
      return;
    }

    state.organisasiItems.forEach((item, index) => {
      organisasiList.appendChild(
        makeItemRow({
          title: item.nama_organisasi || "Tanpa nama",
          subtitle: [item.jabatan, item.periode].filter(Boolean).join(" · "),
          hasMedia: Boolean(item.logo_url),
          thumbUrl: item.logo_url || null,
          onEdit: () => startEditOrganisasi(item),
          onDelete: () => deleteOrganisasi(item.id),
          onMoveUp: () => swapUrutan("organisasi", item, state.organisasiItems[index - 1], loadOrganisasi),
          onMoveDown: () => swapUrutan("organisasi", item, state.organisasiItems[index + 1], loadOrganisasi),
          disableUp: index === 0,
          disableDown: index === state.organisasiItems.length - 1,
        })
      );
    });
  } catch (err) {
    console.error("Gagal memuat organisasi:", err);
    organisasiList.innerHTML = "";
    organisasiList.appendChild(makeEmptyRow("Gagal memuat data organisasi."));
  }
}

function startEditOrganisasi(item) {
  state.organisasiEditingId = item.id;
  state.organisasiLogoFile = null;
  state.organisasiRemoveLogo = false;
  state.organisasiExistingLogoUrl = item.logo_url || "";

  organisasiEditId.value = item.id;
  organisasiNama.value = item.nama_organisasi || "";
  organisasiJabatan.value = item.jabatan || "";
  organisasiPeriode.value = item.periode || "";
  organisasiDeskripsi.value = item.deskripsi || "";
  organisasiLogoInput.value = "";
  updateOrganisasiLogoPreview(state.organisasiExistingLogoUrl);

  organisasiSubmitBtn.textContent = "Update Organisasi";
  organisasiCancelBtn.classList.remove("hidden");
  organisasiForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function cancelEditOrganisasi() {
  state.organisasiEditingId = null;
  state.organisasiLogoFile = null;
  state.organisasiRemoveLogo = false;
  state.organisasiExistingLogoUrl = "";

  organisasiForm.reset();
  organisasiEditId.value = "";
  updateOrganisasiLogoPreview("");

  organisasiSubmitBtn.textContent = "Tambah Organisasi";
  organisasiCancelBtn.classList.add("hidden");
}

async function submitOrganisasi(e) {
  e.preventDefault();
  if (!supabaseClient) return;

  const nama = organisasiNama.value.trim();
  if (!nama) {
    showToast("Nama organisasi wajib diisi.", true);
    return;
  }

  const isEditing = Boolean(state.organisasiEditingId);
  setButtonLoading(organisasiSubmitBtn, true, "Menyimpan...", isEditing ? "Update Organisasi" : "Tambah Organisasi");

  try {
    let logoUrl = state.organisasiExistingLogoUrl;
    if (state.organisasiLogoFile) {
      logoUrl = await uploadFileToStorage(state.organisasiLogoFile, "organisasi");
    } else if (state.organisasiRemoveLogo) {
      logoUrl = "";
    }

    const payload = {
      nama_organisasi: nama,
      jabatan: organisasiJabatan.value.trim(),
      periode: organisasiPeriode.value.trim(),
      deskripsi: organisasiDeskripsi.value.trim(),
      logo_url: logoUrl || null,
    };

    let opError = null;
    if (isEditing) {
      const { error } = await supabaseClient.from("organisasi").update(payload).eq("id", state.organisasiEditingId);
      opError = error;
    } else {
      payload.urutan = state.organisasiItems.length;
      const { error } = await supabaseClient.from("organisasi").insert([payload]);
      opError = error;
    }

    if (opError) throw opError;

    showToast(isEditing ? "Organisasi berhasil diperbarui." : "Organisasi berhasil ditambahkan.");
    cancelEditOrganisasi();
    await loadOrganisasi();
  } catch (err) {
    console.error("Gagal menyimpan organisasi:", err);
    showToast("Gagal menyimpan data organisasi.", true);
  } finally {
    setButtonLoading(organisasiSubmitBtn, false, "Menyimpan...", isEditing ? "Update Organisasi" : "Tambah Organisasi");
  }
}

async function deleteOrganisasi(id) {
  if (!supabaseClient) return;
  if (!confirm("Yakin ingin menghapus organisasi ini?")) return;
  try {
    const { error } = await supabaseClient.from("organisasi").delete().eq("id", id);
    if (error) throw error;
    if (state.organisasiEditingId === id) cancelEditOrganisasi();
    showToast("Organisasi berhasil dihapus.");
    await loadOrganisasi();
  } catch (err) {
    console.error("Gagal menghapus organisasi:", err);
    showToast("Gagal menghapus organisasi.", true);
  }
}

/* -----------------------------------------------------------
   11. GALERI GENERIK (dipakai Kegiatan & Prestasi)
----------------------------------------------------------- */
function renderGalleryGrid({ gridEl, addBtnId, existing, removedIds, newFiles, onRemoveExisting, onRemoveNew }) {
  gridEl.querySelectorAll(".gallery-upload-item").forEach((el) => el.remove());
  const addBtn = document.getElementById(addBtnId);

  existing
    .filter((m) => !removedIds.includes(m.id))
    .forEach((m) => {
      const item = document.createElement("div");
      item.className = "gallery-upload-item";

      if (m.media_type === "video") {
        const video = document.createElement("video");
        video.src = m.media_url;
        video.muted = true;
        item.appendChild(video);
      } else {
        const img = document.createElement("img");
        img.src = m.media_url;
        item.appendChild(img);
      }

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "gallery-remove-btn";
      removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      removeBtn.addEventListener("click", () => onRemoveExisting(m.id));
      item.appendChild(removeBtn);

      gridEl.insertBefore(item, addBtn);
    });

  newFiles.forEach((file, idx) => {
    const item = document.createElement("div");
    item.className = "gallery-upload-item";
    const url = URL.createObjectURL(file);

    if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.src = url;
      video.muted = true;
      item.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = url;
      item.appendChild(img);
    }

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "gallery-remove-btn";
    removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    removeBtn.addEventListener("click", () => onRemoveNew(idx));
    item.appendChild(removeBtn);

    gridEl.insertBefore(item, addBtn);
  });
}

function handleGalleryFilesSelected(fileList, newFilesArray, renderFn) {
  const files = Array.from(fileList || []);
  for (const file of files) {
    const isVideo = file.type.startsWith("video/");
    const validationError = validateFile(file, isVideo ? "video" : "image");
    if (validationError) {
      showToast(`${file.name}: ${validationError}`, true);
      continue;
    }
    newFilesArray.push(file);
  }
  renderFn();
}

/* -----------------------------------------------------------
   12. KEGIATAN: LOAD, CRUD, REORDER, GALERI
----------------------------------------------------------- */
const kegiatanList = document.getElementById("kegiatan-list");
const kegiatanForm = document.getElementById("kegiatan-form");
const kegiatanEditId = document.getElementById("kegiatan-edit-id");
const kegiatanJudul = document.getElementById("kegiatan-judul");
const kegiatanKategori = document.getElementById("kegiatan-kategori");
const kegiatanDeskripsi = document.getElementById("kegiatan-deskripsi");
const kegiatanSubmitBtn = document.getElementById("kegiatan-submit-btn");
const kegiatanCancelBtn = document.getElementById("kegiatan-cancel-btn");
const kegiatanGalleryGrid = document.getElementById("kegiatan-gallery-grid");
const kegiatanGalleryInput = document.getElementById("kegiatan-gallery-input");
const kegiatanGalleryAddBtn = document.getElementById("kegiatan-gallery-add-btn");

function renderKegiatanGallery() {
  renderGalleryGrid({
    gridEl: kegiatanGalleryGrid,
    addBtnId: "kegiatan-gallery-add-btn",
    existing: state.kegiatanGalleryExisting,
    removedIds: state.kegiatanGalleryRemovedIds,
    newFiles: state.kegiatanGalleryNewFiles,
    onRemoveExisting: (id) => {
      state.kegiatanGalleryRemovedIds.push(id);
      renderKegiatanGallery();
    },
    onRemoveNew: (idx) => {
      state.kegiatanGalleryNewFiles.splice(idx, 1);
      renderKegiatanGallery();
    },
  });
}

async function loadKegiatan() {
  if (!supabaseClient || !kegiatanList) return;
  try {
    const { data, error } = await supabaseClient
      .from("kegiatan")
      .select("*, kegiatan_media(id, media_url, media_type, urutan)")
      .order("urutan", { ascending: true })
      .order("urutan", { foreignTable: "kegiatan_media", ascending: true });

    if (error) throw error;

    state.kegiatanItems = data || [];
    document.getElementById("admin-stat-kegiatan").textContent = state.kegiatanItems.length;

    kegiatanList.innerHTML = "";
    if (state.kegiatanItems.length === 0) {
      kegiatanList.appendChild(makeEmptyRow("Belum ada kegiatan."));
      return;
    }

    state.kegiatanItems.forEach((item, index) => {
      const gallery = Array.isArray(item.kegiatan_media) ? item.kegiatan_media : [];
      const firstImage = gallery.find((g) => g.media_type !== "video");

      kegiatanList.appendChild(
        makeItemRow({
          title: item.judul || "Tanpa judul",
          subtitle: item.kategori || "",
          hasMedia: gallery.length > 0,
          thumbUrl: firstImage ? firstImage.media_url : null,
          onEdit: () => startEditKegiatan(item),
          onDelete: () => deleteKegiatan(item.id),
          onMoveUp: () => swapUrutan("kegiatan", item, state.kegiatanItems[index - 1], loadKegiatan),
          onMoveDown: () => swapUrutan("kegiatan", item, state.kegiatanItems[index + 1], loadKegiatan),
          disableUp: index === 0,
          disableDown: index === state.kegiatanItems.length - 1,
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
  state.kegiatanGalleryExisting = Array.isArray(item.kegiatan_media) ? item.kegiatan_media : [];
  state.kegiatanGalleryNewFiles = [];
  state.kegiatanGalleryRemovedIds = [];

  kegiatanEditId.value = item.id;
  kegiatanJudul.value = item.judul || "";
  kegiatanKategori.value = item.kategori || "";
  kegiatanDeskripsi.value = item.deskripsi || "";
  kegiatanGalleryInput.value = "";
  renderKegiatanGallery();

  kegiatanSubmitBtn.textContent = "Update Kegiatan";
  kegiatanCancelBtn.classList.remove("hidden");
  kegiatanForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function cancelEditKegiatan() {
  state.kegiatanEditingId = null;
  state.kegiatanGalleryExisting = [];
  state.kegiatanGalleryNewFiles = [];
  state.kegiatanGalleryRemovedIds = [];

  kegiatanForm.reset();
  kegiatanEditId.value = "";
  kegiatanGalleryInput.value = "";
  renderKegiatanGallery();

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
    const payload = {
      judul,
      kategori: kegiatanKategori.value.trim(),
      deskripsi: kegiatanDeskripsi.value.trim(),
    };

    let kegiatanId = state.kegiatanEditingId;

    if (isEditing) {
      const { error } = await supabaseClient.from("kegiatan").update(payload).eq("id", kegiatanId);
      if (error) throw error;
    } else {
      payload.urutan = state.kegiatanItems.length;
      payload.created_at = new Date().toISOString();
      const { data: inserted, error } = await supabaseClient.from("kegiatan").insert([payload]).select().maybeSingle();
      if (error) throw error;
      kegiatanId = inserted.id;
    }

    for (const removedId of state.kegiatanGalleryRemovedIds) {
      await supabaseClient.from("kegiatan_media").delete().eq("id", removedId);
    }

    const remainingCount = state.kegiatanGalleryExisting.filter(
      (m) => !state.kegiatanGalleryRemovedIds.includes(m.id)
    ).length;

    for (let i = 0; i < state.kegiatanGalleryNewFiles.length; i++) {
      const file = state.kegiatanGalleryNewFiles[i];
      const mediaUrl = await uploadFileToStorage(file, "kegiatan");
      const mediaType = file.type.startsWith("video/") ? "video" : "image";
      await supabaseClient.from("kegiatan_media").insert([
        {
          kegiatan_id: kegiatanId,
          media_url: mediaUrl,
          media_type: mediaType,
          urutan: remainingCount + i,
        },
      ]);
    }

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
  if (!supabaseClient) return;
  if (!confirm("Yakin ingin menghapus kegiatan ini? Galeri media terkait juga akan terhapus.")) return;
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
   13. PRESTASI: LOAD, CRUD, REORDER, GALERI
----------------------------------------------------------- */
const prestasiList = document.getElementById("prestasi-list");
const prestasiForm = document.getElementById("prestasi-form");
const prestasiEditId = document.getElementById("prestasi-edit-id");
const prestasiNama = document.getElementById("prestasi-nama");
const prestasiTahun = document.getElementById("prestasi-tahun");
const prestasiDeskripsi = document.getElementById("prestasi-deskripsi");
const prestasiSubmitBtn = document.getElementById("prestasi-submit-btn");
const prestasiCancelBtn = document.getElementById("prestasi-cancel-btn");
const prestasiGalleryGrid = document.getElementById("prestasi-gallery-grid");
const prestasiGalleryInput = document.getElementById("prestasi-gallery-input");
const prestasiGalleryAddBtn = document.getElementById("prestasi-gallery-add-btn");

function renderPrestasiGallery() {
  renderGalleryGrid({
    gridEl: prestasiGalleryGrid,
    addBtnId: "prestasi-gallery-add-btn",
    existing: state.prestasiGalleryExisting,
    removedIds: state.prestasiGalleryRemovedIds,
    newFiles: state.prestasiGalleryNewFiles,
    onRemoveExisting: (id) => {
      state.prestasiGalleryRemovedIds.push(id);
      renderPrestasiGallery();
    },
    onRemoveNew: (idx) => {
      state.prestasiGalleryNewFiles.splice(idx, 1);
      renderPrestasiGallery();
    },
  });
}

async function loadPrestasi() {
  if (!supabaseClient || !prestasiList) return;
  try {
    const { data, error } = await supabaseClient
      .from("prestasi")
      .select("*, prestasi_media(id, media_url, media_type, urutan)")
      .order("urutan", { ascending: true })
      .order("urutan", { foreignTable: "prestasi_media", ascending: true });

    if (error) throw error;

    state.prestasiItems = data || [];
    document.getElementById("admin-stat-prestasi").textContent = state.prestasiItems.length;

    prestasiList.innerHTML = "";
    if (state.prestasiItems.length === 0) {
      prestasiList.appendChild(makeEmptyRow("Belum ada prestasi."));
      return;
    }

    state.prestasiItems.forEach((item, index) => {
      const gallery = Array.isArray(item.prestasi_media) ? item.prestasi_media : [];
      const firstImage = gallery.find((g) => g.media_type !== "video");

      prestasiList.appendChild(
        makeItemRow({
          title: item.nama || "Tanpa nama",
          subtitle: item.tahun || "",
          hasMedia: gallery.length > 0,
          thumbUrl: firstImage ? firstImage.media_url : null,
          onEdit: () => startEditPrestasi(item),
          onDelete: () => deletePrestasi(item.id),
          onMoveUp: () => swapUrutan("prestasi", item, state.prestasiItems[index - 1], loadPrestasi),
          onMoveDown: () => swapUrutan("prestasi", item, state.prestasiItems[index + 1], loadPrestasi),
          disableUp: index === 0,
          disableDown: index === state.prestasiItems.length - 1,
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
  state.prestasiGalleryExisting = Array.isArray(item.prestasi_media) ? item.prestasi_media : [];
  state.prestasiGalleryNewFiles = [];
  state.prestasiGalleryRemovedIds = [];

  prestasiEditId.value = item.id;
  prestasiNama.value = item.nama || "";
  prestasiTahun.value = item.tahun || "";
  prestasiDeskripsi.value = item.deskripsi || "";
  prestasiGalleryInput.value = "";
  renderPrestasiGallery();

  prestasiSubmitBtn.textContent = "Update Prestasi";
  prestasiCancelBtn.classList.remove("hidden");
  prestasiForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function cancelEditPrestasi() {
  state.prestasiEditingId = null;
  state.prestasiGalleryExisting = [];
  state.prestasiGalleryNewFiles = [];
  state.prestasiGalleryRemovedIds = [];

  prestasiForm.reset();
  prestasiEditId.value = "";
  prestasiGalleryInput.value = "";
  renderPrestasiGallery();

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
    const payload = { nama, tahun, deskripsi: prestasiDeskripsi.value.trim() };
    let prestasiId = state.prestasiEditingId;

    if (isEditing) {
      const { error } = await supabaseClient.from("prestasi").update(payload).eq("id", prestasiId);
      if (error) throw error;
    } else {
      payload.urutan = state.prestasiItems.length;
      const { data: inserted, error } = await supabaseClient.from("prestasi").insert([payload]).select().maybeSingle();
      if (error) throw error;
      prestasiId = inserted.id;
    }

    for (const removedId of state.prestasiGalleryRemovedIds) {
      await supabaseClient.from("prestasi_media").delete().eq("id", removedId);
    }

    const remainingCount = state.prestasiGalleryExisting.filter(
      (m) => !state.prestasiGalleryRemovedIds.includes(m.id)
    ).length;

    for (let i = 0; i < state.prestasiGalleryNewFiles.length; i++) {
      const file = state.prestasiGalleryNewFiles[i];
      const mediaUrl = await uploadFileToStorage(file, "prestasi");
      const mediaType = file.type.startsWith("video/") ? "video" : "image";
      await supabaseClient.from("prestasi_media").insert([
        {
          prestasi_id: prestasiId,
          media_url: mediaUrl,
          media_type: mediaType,
          urutan: remainingCount + i,
        },
      ]);
    }

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
  if (!supabaseClient) return;
  if (!confirm("Yakin ingin menghapus prestasi ini? Galeri media terkait juga akan terhapus.")) return;
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
   14. SOSMED: LOAD & SAVE
----------------------------------------------------------- */
const sosmedForm = document.getElementById("sosmed-form");
const sosmedTiktok = document.getElementById("sosmed-tiktok");
const sosmedInstagram = document.getElementById("sosmed-instagram");
const sosmedEmail = document.getElementById("sosmed-email");
const sosmedSubmitBtn = document.getElementById("sosmed-submit-btn");
const sosmedFileInput = document.getElementById("sosmed-file-input");
const sosmedFileCurrent = document.getElementById("sosmed-file-current");
const sosmedFileSelectedHint = document.getElementById("sosmed-file-selected-hint");

function renderSosmedFileCurrent() {
  sosmedFileCurrent.innerHTML = "";
  if (!state.sosmedExistingFileUrl) {
    const span = document.createElement("span");
    span.className = "empty-text file-empty-inline";
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
  removeBtn.className = "btn-delete";
  removeBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
  removeBtn.addEventListener("click", () => {
    state.sosmedRemoveFile = true;
    state.sosmedExistingFileUrl = "";
    renderSosmedFileCurrent();
  });

  sosmedFileCurrent.append(link, removeBtn);
}

async function loadSosmed() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient.from("sosmed").select("*").limit(1).maybeSingle();
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
    showToast("Gagal menyimpan tautan sosmed.", true);
  } finally {
    setButtonLoading(sosmedSubmitBtn, false, "Menyimpan...", "Simpan Sosmed");
  }
}

/* -----------------------------------------------------------
   15. LOAD SEMUA DATA DASHBOARD
----------------------------------------------------------- */
async function loadAllAdminData() {
  await Promise.all([loadProfile(), loadPendidikan(), loadOrganisasi(), loadKegiatan(), loadPrestasi(), loadSosmed()]);
}

/* -----------------------------------------------------------
   16. EVENT LISTENERS & INIT
----------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  initTabs();

  loginForm.addEventListener("submit", handleLoginSubmit);
  logoutBtn.addEventListener("click", handleLogout);

  saveProfileBtn.addEventListener("click", saveProfile);
  profilePhotoInput.addEventListener("change", handleProfilePhotoInputChange);

  pendidikanForm.addEventListener("submit", submitPendidikan);
  pendidikanCancelBtn.addEventListener("click", cancelEditPendidikan);

  organisasiForm.addEventListener("submit", submitOrganisasi);
  organisasiCancelBtn.addEventListener("click", cancelEditOrganisasi);
  organisasiLogoInput.addEventListener("change", handleOrganisasiLogoInputChange);
  organisasiLogoRemoveBtn.addEventListener("click", handleOrganisasiLogoRemoveClick);

  kegiatanForm.addEventListener("submit", submitKegiatan);
  kegiatanCancelBtn.addEventListener("click", cancelEditKegiatan);
  kegiatanGalleryAddBtn.addEventListener("click", () => kegiatanGalleryInput.click());
  kegiatanGalleryInput.addEventListener("change", () => {
    handleGalleryFilesSelected(kegiatanGalleryInput.files, state.kegiatanGalleryNewFiles, renderKegiatanGallery);
    kegiatanGalleryInput.value = "";
  });

  prestasiForm.addEventListener("submit", submitPrestasi);
  prestasiCancelBtn.addEventListener("click", cancelEditPrestasi);
  prestasiGalleryAddBtn.addEventListener("click", () => prestasiGalleryInput.click());
  prestasiGalleryInput.addEventListener("change", () => {
    handleGalleryFilesSelected(prestasiGalleryInput.files, state.prestasiGalleryNewFiles, renderPrestasiGallery);
    prestasiGalleryInput.value = "";
  });

  sosmedForm.addEventListener("submit", saveSosmed);
  sosmedFileInput.addEventListener("change", handleSosmedFileInputChange);

  if (!supabaseClient) {
    loginError.textContent = "Supabase belum terhubung. Periksa konfigurasi.";
    return;
  }

  try {
    const { data } = await supabaseClient.auth.getSession();
    if (data && data.session) {
      showDashboard(data.session);
    } else {
      showLogin();
    }
  } catch (err) {
    console.error("Gagal memeriksa sesi login:", err);
    showLogin();
  }

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" && session) {
      showDashboard(session);
    }
    if (event === "SIGNED_OUT") {
      showLogin();
    }
  });
});
