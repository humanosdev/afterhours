/**
 * Fixed bottom violet wash for main app surfaces (Hub, Chat, Settings, etc.).
 * Map and auth/marketing shells omit this to avoid stacking duplicate gradients.
 */
export function InnerAppVioletUnderglow() {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[1] h-[min(52vh,30rem)] bg-gradient-to-t from-accent-violet/28 via-accent-violet/10 to-transparent"
      aria-hidden
    />
  );
}
