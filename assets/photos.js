(function () {
  "use strict";
  const DB_NAME = "tabi-private-photos";
  const STORE = "photos";
  let db;
  let objectUrls = [];

  function openDatabase() {
    return new Promise(function (resolve, reject) {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = function () {
        const store = request.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("city", "city", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      };
      request.onsuccess = function () { db = request.result; resolve(db); };
      request.onerror = function () { reject(request.error); };
    });
  }

  function transaction(mode, action) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      const request = action(store);
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }

  function resizeImage(file) {
    return createImageBitmap(file).then(function (bitmap) {
      const max = 1600;
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      return new Promise(function (resolve) {
        canvas.toBlob(function (blob) { resolve(blob || file); }, "image/jpeg", .84);
      });
    }).catch(function () { return file; });
  }

  async function addFiles(files) {
    const city = document.getElementById("photoCity").value;
    const caption = document.getElementById("photoCaption").value.trim();
    const status = document.getElementById("photoStorageInfo");
    status.textContent = "Preparazione foto…";
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const blob = await resizeImage(file);
      await transaction("readwrite", function (store) {
        return store.add({ city: city, caption: caption, blob: blob, createdAt: Date.now(), originalName: file.name });
      });
    }
    document.getElementById("photoCaption").value = "";
    status.textContent = "Foto salvate solo su questo dispositivo";
    await render();
  }

  async function removePhoto(id) {
    if (!window.confirm("Eliminare questa foto dal diario locale? L'operazione non è recuperabile.")) return;
    await transaction("readwrite", function (store) { return store.delete(id); });
    await render();
  }

  function cityName(id) {
    const city = window.JAPAN_DATA.cities.find(function (candidate) { return candidate.id === id; });
    return city ? city.name : id;
  }

  function escapeHTML(value) {
    return String(value || "").replace(/[&<>"']/g, function (char) {
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char];
    });
  }

  async function render() {
    if (!db) return;
    objectUrls.forEach(URL.revokeObjectURL);
    objectUrls = [];
    const filter = document.getElementById("photoCityFilter").value;
    const all = await transaction("readonly", function (store) { return store.getAll(); });
    const photos = all.filter(function (photo) { return filter === "all" || photo.city === filter; }).sort(function (a, b) { return b.createdAt - a.createdAt; });
    const grid = document.getElementById("photoGrid");
    grid.innerHTML = photos.map(function (photo) {
      const url = URL.createObjectURL(photo.blob);
      objectUrls.push(url);
      return '<figure class="photo-card"><img src="' + url + '" alt="' + escapeHTML(photo.caption || "Foto di " + cityName(photo.city)) + '">'
        + '<button type="button" data-photo-delete="' + photo.id + '" aria-label="Elimina foto">×</button>'
        + '<figcaption><b>' + escapeHTML(cityName(photo.city)) + '</b><span>' + escapeHTML(photo.caption) + '</span></figcaption></figure>';
    }).join("");
    document.getElementById("photoEmpty").hidden = photos.length !== 0;
    const bytes = all.reduce(function (total, photo) { return total + (photo.blob.size || 0); }, 0);
    document.getElementById("photoStorageInfo").textContent = all.length + " foto · " + (bytes / 1024 / 1024).toFixed(1) + " MB locali";
  }

  function setup() {
    const options = window.JAPAN_DATA.cities.map(function (city) { return '<option value="' + city.id + '">' + city.name + '</option>'; }).join("");
    document.getElementById("photoCity").innerHTML = options;
    document.getElementById("photoCityFilter").innerHTML = '<option value="all">Tutte le città</option>' + options;
    document.getElementById("photoInput").addEventListener("change", async function (event) {
      const files = Array.from(event.target.files || []);
      if (files.length) await addFiles(files);
      event.target.value = "";
    });
    document.getElementById("photoCityFilter").addEventListener("change", render);
    document.getElementById("photoGrid").addEventListener("click", function (event) {
      const button = event.target.closest("[data-photo-delete]");
      if (button) removePhoto(Number(button.dataset.photoDelete));
    });
    openDatabase().then(render).catch(function () {
      document.getElementById("photoStorageInfo").textContent = "Archivio locale non disponibile";
    });
  }

  setup();
})();
