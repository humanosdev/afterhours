/**
 * Runs in <head> during development only, before Next.js chunk scripts execute.
 * Unregisters any service worker and clears Cache Storage so stale precache
 * cannot intercept `/_next/static/*` (which shows up as layout.css / chunk 404s).
 */
export const DEV_PURGE_SERVICE_WORKER_SCRIPT = `
(function(){
  try {
    var KEY = "ah-dev-purge-v10";
    if (sessionStorage.getItem(KEY) === "1") return;
    var hadRegs = false;
    var hadCaches = false;
    var ctrl = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
    var p = Promise.resolve();
    if ("serviceWorker" in navigator) {
      p = navigator.serviceWorker.getRegistrations().then(function (regs) {
        hadRegs = regs.length > 0;
        return Promise.all(regs.map(function (r) { return r.unregister(); }));
      });
    }
    p = p.then(function () {
      if (!("caches" in window)) return;
      return caches.keys().then(function (keys) {
        hadCaches = keys.length > 0;
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      });
    });
    p.then(function () {
      sessionStorage.setItem(KEY, "1");
      if (hadRegs || hadCaches || ctrl) location.reload();
    }).catch(function () {
      try { sessionStorage.setItem(KEY, "1"); } catch (e2) {}
    });
  } catch (e) {
    try { sessionStorage.setItem("ah-dev-purge-v10", "1"); } catch (e2) {}
  }
})();
`.trim();
