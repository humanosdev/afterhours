/** Bump all `useMyProfile` / `useMyAvatar` consumers after edit-profile save or avatar upload. */

type ProfileUpdatedListener = () => void;

const listeners = new Set<ProfileUpdatedListener>();

export function subscribeProfileUpdated(listener: ProfileUpdatedListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitProfileUpdated(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* listener */
    }
  });
}
