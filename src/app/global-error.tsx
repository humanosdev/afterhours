"use client";

/**
 * Root layout errors (must include html/body — no shared layout).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#000", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
          }}
        >
          <p style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Intencity hit a fatal error</p>
          <p style={{ margin: 0, fontSize: 14, opacity: 0.75, textAlign: "center", maxWidth: 380 }}>
            {error.message || "Please reload the app."}
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
      </body>
    </html>
  );
}
