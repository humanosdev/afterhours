/** Resolve after the browser loads (or fails) an image — avoids UI popping in late. */
export function preloadImage(url: string | null | undefined, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => resolve();
    if (typeof window === "undefined") {
      queueMicrotask(finish);
      return;
    }
    const trimmed = url?.trim();
    if (!trimmed) {
      queueMicrotask(finish);
      return;
    }
    const img = document.createElement("img");
    const timer = window.setTimeout(finish, timeoutMs);
    img.onload = () => {
      window.clearTimeout(timer);
      finish();
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      finish();
    };
    img.src = trimmed;
  });
}
