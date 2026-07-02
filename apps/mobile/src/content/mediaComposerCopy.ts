import { mediaLexicon as L } from "./mediaLexicon";

/**
 * Create composer copy — Intencity moments + shares.
 */
export const mediaComposerCopy = {
  sheet: {
    title: "Create",
    body: `Add a ${L.moment.label.toLowerCase()} to your ring or a ${L.share.label.toLowerCase()} to the hub feed.`,
    cta: {
      moment: `Camera — ${L.moment.label.toLowerCase()}`,
      share: `Library — ${L.share.labelPlural.toLowerCase()}`,
    },
    hint: {
      moment: `${L.moment.label} · rings on the hub`,
      share: `${L.share.labelPlural} · hub feed`,
    },
  },
  modal: {
    title: { moment: L.moment.new, share: L.share.new },
    badge: { moment: L.moment.label, share: L.share.label },
    cameraUnavailableTitle: "Camera unavailable",
    cameraUnavailableBody: "On blocked permissions, open your library instead.",
    openLibrary: "Choose from library",
    retake: "Retake",
    publish: { moment: L.moment.add, share: L.share.add },
    publishing: L.publish.publishing,
    permissionDenied: L.publish.permissionPhotos,
    pickerFailed: "Couldn't open your photo library. Try again.",
    cameraStartFailed: "Couldn't start the camera. Try again or choose from library.",
    uploadFailed: L.publish.failed,
    readFailed: "Couldn't read the selected photo. Try a different image.",
  },
} as const;
