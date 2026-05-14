"use client";

/**
 * Route-level error boundary — generic copy so users are not exposed to stack traces.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const code = error.digest || "ERR";
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
      <p style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Something went wrong</p>
      <p style={{ margin: 0, fontSize: 14, opacity: 0.8, textAlign: "center", maxWidth: 360, lineHeight: 1.45 }}>
        Please wait a second and reload the page. If it keeps happening, try again later.
      </p>
      <p style={{ margin: 0, fontSize: 12, opacity: 0.5, letterSpacing: "0.04em" }}>{code}</p>
      <button
        type="button"
        onClick={() => reset()}
        style={{
          padding: "10px 18px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.25)",
          background: "rgba(255,255,255,0.1)",
          color: "#fff",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Reload
      </button>
    </div>
  );
}
