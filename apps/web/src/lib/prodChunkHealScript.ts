/**
 * Runs in <head> during production before React boot.
 * If hashed Next chunk URLs in the current document are missing (404),
 * purge SW + Cache Storage once and reload to recover from stale precache.
 */
export const PROD_CHUNK_HEAL_SCRIPT = `
(function () {
  try {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    var KEY = "ah-prod-chunk-heal-v1";
    if (sessionStorage.getItem(KEY) === "1") return;

    var chunkScripts = Array.prototype.slice.call(
      document.querySelectorAll('script[src*="/_next/static/chunks/"]')
    );
    if (!chunkScripts.length) return;

    var urls = chunkScripts
      .map(function (el) { return el && el.src ? String(el.src) : ""; })
      .filter(Boolean)
      .slice(0, 4);
    if (!urls.length) return;

    Promise.all(
      urls.map(function (u) {
        return fetch(u, { method: "GET", cache: "no-store" })
          .then(function (res) { return !!(res && res.ok); })
          .catch(function () { return false; });
      })
    ).then(function (okFlags) {
      var hasMissingChunk = okFlags.some(function (ok) { return !ok; });
      if (!hasMissingChunk) return;

      sessionStorage.setItem(KEY, "1");
      navigator.serviceWorker.getRegistrations()
        .then(function (regs) {
          return Promise.all(regs.map(function (r) { return r.unregister(); }));
        })
        .then(function () {
          if (!("caches" in window)) return;
          return caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (k) { return caches.delete(k); }));
          });
        })
        .finally(function () {
          location.reload();
        });
    });
  } catch (e) {
    // No-op: fail open.
  }
})();
`.trim();
