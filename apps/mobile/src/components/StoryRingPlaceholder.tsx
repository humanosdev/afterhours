import { StoryRing } from "./StoryRing";

type StoryRingPlaceholderProps = {
  label: string;
  accent?: boolean;
};

/** @deprecated Use `StoryRing` — kept for hub import stability. */
export function StoryRingPlaceholder({ label, accent = false }: StoryRingPlaceholderProps) {
  if (accent) {
    return <StoryRing label={label} variant="add" />;
  }
  return <StoryRing label={label} variant="avatar" ringState="none" />;
}
