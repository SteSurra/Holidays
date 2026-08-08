// Offline pack URLs: CORS-safe raw.githubusercontent.com (map + photo orphan branches).
// GitHub Release assets lack Access-Control-Allow-Origin — do not use them for browser fetch.
// bytes must match the published file; the app verifies size after download.
window.TABI_OFFLINE_MANIFEST = {
  version: 2,
  releaseTag: "offline-map-packs",
  contentSha: "46fad6f1b0da17b13452dca5bdb4f9bba095d788",
  photoContentSha: "feaf9b2b9bfa426749a5ee9386456913bd1018f4",
  packs: {
    ampio_z14: {
      file: "ampio-z14.pmtiles",
      bytes: 76430958,
      url: "https://raw.githubusercontent.com/SteSurra/Holidays/46fad6f1b0da17b13452dca5bdb4f9bba095d788/ampio-z14.pmtiles"
    },
    ampio_z15: {
      file: "ampio-z15.pmtiles",
      bytes: 204151159,
      url: null,
      parts: [
        { url: "https://raw.githubusercontent.com/SteSurra/Holidays/46fad6f1b0da17b13452dca5bdb4f9bba095d788/ampio-z15.pmtiles.part-000", bytes: 99614720 },
        { url: "https://raw.githubusercontent.com/SteSurra/Holidays/46fad6f1b0da17b13452dca5bdb4f9bba095d788/ampio-z15.pmtiles.part-001", bytes: 99614720 },
        { url: "https://raw.githubusercontent.com/SteSurra/Holidays/46fad6f1b0da17b13452dca5bdb4f9bba095d788/ampio-z15.pmtiles.part-002", bytes: 4921719 }
      ]
    },
    max_z14: {
      file: "japan-z14.pmtiles",
      bytes: 1253060341,
      url: null,
      parts: [
        { url: "https://raw.githubusercontent.com/SteSurra/Holidays/46fad6f1b0da17b13452dca5bdb4f9bba095d788/japan-z14.pmtiles.part-000", bytes: 99614720 },
        { url: "https://raw.githubusercontent.com/SteSurra/Holidays/46fad6f1b0da17b13452dca5bdb4f9bba095d788/japan-z14.pmtiles.part-001", bytes: 99614720 },
        { url: "https://raw.githubusercontent.com/SteSurra/Holidays/46fad6f1b0da17b13452dca5bdb4f9bba095d788/japan-z14.pmtiles.part-002", bytes: 99614720 },
        { url: "https://raw.githubusercontent.com/SteSurra/Holidays/46fad6f1b0da17b13452dca5bdb4f9bba095d788/japan-z14.pmtiles.part-003", bytes: 99614720 },
        { url: "https://raw.githubusercontent.com/SteSurra/Holidays/46fad6f1b0da17b13452dca5bdb4f9bba095d788/japan-z14.pmtiles.part-004", bytes: 99614720 },
        { url: "https://raw.githubusercontent.com/SteSurra/Holidays/46fad6f1b0da17b13452dca5bdb4f9bba095d788/japan-z14.pmtiles.part-005", bytes: 99614720 },
        { url: "https://raw.githubusercontent.com/SteSurra/Holidays/46fad6f1b0da17b13452dca5bdb4f9bba095d788/japan-z14.pmtiles.part-006", bytes: 99614720 },
        { url: "https://raw.githubusercontent.com/SteSurra/Holidays/46fad6f1b0da17b13452dca5bdb4f9bba095d788/japan-z14.pmtiles.part-007", bytes: 99614720 },
        { url: "https://raw.githubusercontent.com/SteSurra/Holidays/46fad6f1b0da17b13452dca5bdb4f9bba095d788/japan-z14.pmtiles.part-008", bytes: 99614720 },
        { url: "https://raw.githubusercontent.com/SteSurra/Holidays/46fad6f1b0da17b13452dca5bdb4f9bba095d788/japan-z14.pmtiles.part-009", bytes: 99614720 },
        { url: "https://raw.githubusercontent.com/SteSurra/Holidays/46fad6f1b0da17b13452dca5bdb4f9bba095d788/japan-z14.pmtiles.part-010", bytes: 99614720 },
        { url: "https://raw.githubusercontent.com/SteSurra/Holidays/46fad6f1b0da17b13452dca5bdb4f9bba095d788/japan-z14.pmtiles.part-011", bytes: 99614720 },
        { url: "https://raw.githubusercontent.com/SteSurra/Holidays/46fad6f1b0da17b13452dca5bdb4f9bba095d788/japan-z14.pmtiles.part-012", bytes: 57683701 }
      ]
    },
    max_z15: { file: "japan-z15.pmtiles", bytes: 2729756673, url: null },
    photos_medio: {
      file: "photos-medio.tar.gz",
      bytes: 131773490,
      url: null,
      parts: [
        { url: "https://raw.githubusercontent.com/SteSurra/Holidays/feaf9b2b9bfa426749a5ee9386456913bd1018f4/photos-medio.tar.gz.part-000", bytes: 99614720 },
        { url: "https://raw.githubusercontent.com/SteSurra/Holidays/feaf9b2b9bfa426749a5ee9386456913bd1018f4/photos-medio.tar.gz.part-001", bytes: 32158770 }
      ]
    }
  }
};
