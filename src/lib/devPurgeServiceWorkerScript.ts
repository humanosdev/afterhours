/**
 * Runs in <head> during development only, before Next.js chunk scripts execute.
 *
 * 1. Always unregisters service workers + clears Cache Storage (no long-lived skip —
 *    the old `ah-dev-purge-v10` skip caused stale precache to keep serving HTML that
 *    pointed at deleted chunk URLs → 404 on `/_next/static/chunks/app/...` and a blank page).
 * 2. Auto-reloads at most once per tab when we actually removed an SW, caches, or had a
 *    controlling worker, so we do not loop.
 * 3. After DOM is ready, probes a few chunk script URLs; if any 404, purge again and
 *    force a full reload (clears reload cap so recovery can run once more).
 */
export const DEV_PURGE_SERVICE_WORKER_SCRIPT = `
(function () {
  try {
    var RELOAD_KEY = "ah-dev-purge-reloaded-v12";
    var hadRegs = false;
    var hadCaches = false;
    var ctrl = !!(navigator.serviceWorker && navigator.serviceWorker.controller);

    function purgeAll() {
      var p = Promise.resolve();
      if ("serviceWorker" in navigator) {
        p = navigator.serviceWorker.getRegistrations().then(function (regs) {
          hadRegs = regs.length > 0;
          return Promise.all(regs.map(function (r) { return r.unregister(); }));
        });
      }
      return p.then(function () {
        if (!("caches" in window)) return;
        return caches.keys().then(function (keys) {
          hadCaches = keys.length > 0;
          return Promise.all(keys.map(function (k) { return caches.delete(k); }));
        });
      });
    }

    function maybeReloadAfterPurge() {
      if (!(hadRegs || hadCaches || ctrl)) return;
      if (sessionStorage.getItem(RELOAD_KEY) === "1") return;
      sessionStorage.setItem(RELOAD_KEY, "1");
      try {
        sessionStorage.removeItem("ah-dev-purge-v10");
      } catch (e) {}
      location.reload();
    }

    purgeAll()
      .then(maybeReloadAfterPurge)
      .catch(function () {});

    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(function () {
        var nodes = document.querySelectorAll('script[src*="/_next/static/chunks/"]');
        var urls = [];
        for (var i = 0; i < nodes.length && urls.length < 6; i++) {
          var s = nodes[i] && nodes[i].src;
          if (s) urls.push(String(s));
        }
        if (!urls.length) return;
        Promise.all(
          urls.map(function (u) {
            return fetch(u, { method: "GET", cache: "no-store" })
              .then(function (r) { return !!(r && r.ok); })
              .catch(function () { return false; });
          })
        ).then(function (flags) {
          var any404 = flags.some(function (ok) { return !ok; });
          if (!any404) return;
          var CHUNK_FIX_KEY = "ah-dev-chunk-fix-v1";
          if (sessionStorage.getItem(CHUNK_FIX_KEY) === "1") return;
          sessionStorage.setItem(CHUNK_FIX_KEY, "1");
          sessionStorage.removeItem(RELOAD_KEY);
          hadRegs = false;
          hadCaches = false;
          purgeAll().finally(function () {
            location.reload();
          });
        });
      }, 0);
    });
  } catch (e) {}
})();
`.trim();
