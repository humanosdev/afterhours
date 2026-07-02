import type { PairBlockStatus } from "../lib/pairBlockStatus";

export type ChatThreadPeer = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type ChatStoryReplyAttachment = {
  id: string;
  media_url: string;
  is_share: boolean;
};

export type ChatThreadMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  /** Story/moment the sender replied to (DM story reply). */
  story_id?: string | null;
  story_attachment?: ChatStoryReplyAttachment | null;
  /** Local optimistic row before insert completes (PWA parity). */
  optimistic?: boolean;
  /** Outbound send lifecycle — native only. */
  sendState?: "sending" | "queued";
};

export type ChatThreadGateError = "not_found" | "not_participant" | null;

export type ChatThreadData = {
  peer: ChatThreadPeer | null;
  otherId: string | null;
  messages: ChatThreadMessage[];
  pairBlock: PairBlockStatus;
  gateError: ChatThreadGateError;
  messagesError: string | null;
};
