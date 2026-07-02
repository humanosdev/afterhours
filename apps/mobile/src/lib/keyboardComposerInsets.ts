/** Dock a bottom composer flush on the keyboard (or safe area when closed). */
export function keyboardComposerInsets(args: {
  keyboardInset: number;
  safeBottom: number;
  restingPad?: number;
}): { marginBottom: number; paddingBottom: number } {
  const resting = args.restingPad ?? 8;
  if (args.keyboardInset > 0) {
    return { marginBottom: args.keyboardInset, paddingBottom: resting };
  }
  return {
    marginBottom: 0,
    paddingBottom: Math.max(args.safeBottom, resting) + resting,
  };
}
