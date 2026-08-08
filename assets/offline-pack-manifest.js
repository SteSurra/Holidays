// Map pack URLs: set when .pmtiles are published (e.g. GitHub Release offline-packs-v1).
// bytes must match the published file; the app verifies size after download.
window.TABI_OFFLINE_MANIFEST = {
  version: 1,
  releaseTag: "offline-packs-v1",
  packs: {
    ampio_z14: { file: "ampio-z14.pmtiles", bytes: 76430958, url: "https://github.com/SteSurra/Holidays/releases/download/offline-packs-v1/ampio-z14.pmtiles" },
    ampio_z15: { file: "ampio-z15.pmtiles", bytes: 204151159, url: "https://github.com/SteSurra/Holidays/releases/download/offline-packs-v1/ampio-z15.pmtiles" },
    max_z14: { file: "japan-z14.pmtiles", bytes: 1253060341, url: "https://github.com/SteSurra/Holidays/releases/download/offline-packs-v1/japan-z14.pmtiles" },
    max_z15: { file: "japan-z15.pmtiles", bytes: 2729756673, url: null },
  }
};
