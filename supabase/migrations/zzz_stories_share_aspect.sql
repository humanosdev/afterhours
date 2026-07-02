-- Native hub share crop format (Instagram-style portrait 4:5 or square 1:1).
-- Optional column: clients omit on insert when migration not applied yet.
alter table public.stories add column if not exists share_aspect text;

comment on column public.stories.share_aspect is 'Hub share frame: portrait (4:5) or square (1:1). Null = portrait for legacy rows.';
