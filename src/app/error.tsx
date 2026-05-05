"use client";

/**
 * Route-level error boundary. Keeps Next from spinning on
 * "missing required error components, refreshing..." when dev cache is flaky.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        background: "#000",
        color: "#fff",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <p style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Something broke</p>
      <p style={{ margin: 0, fontSize: 14, opacity: 0.75, textAlign: "center", maxWidth: 360 }}>
        {error.message || "Unexpected error"}
      </p>
      <p style={{ margin: 0, fontSize: 12, opacity: 0.55, textAlign: "center", maxWidth: 440 }}>
        Dev recovery: if you see <code style={{ opacity: 0.85 }}>Cannot find module &apos;./NNN.js&apos;</code> or 500s on{" "}
        <code style={{ opacity: 0.85 }}>/_next/static/...</code>, the dev cache is out of sync. Stop <code style={{ opacity: 0.85 }}>next dev</code>, run{" "}
        <code style={{ opacity: 0.85 }}>rm -rf .next</code> in the project root (or <code style={{ opacity: 0.85 }}>npm run dev:clean</code>), start dev again, hard-refresh. Clear this origin’s
        service worker once (Application → Storage). Do not run <code style={{ opacity: 0.85 }}>next build</code> and <code style={{ opacity: 0.85 }}>next dev</code> on the same <code style={{ opacity: 0.85 }}>.next</code> folder in parallel.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        style={{
          padding: "10px 18px",
          borderRadius: 999,
          border: "1px solid rgba(122,60,255,0.6)",
          background: "rgba(122,60,255,0.25)",
          color: "#fff",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  );
}
