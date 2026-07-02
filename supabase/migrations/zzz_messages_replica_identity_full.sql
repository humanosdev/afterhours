-- Realtime DELETE payloads include full old row (unsend for both participants).

ALTER TABLE public.messages REPLICA IDENTITY FULL;
