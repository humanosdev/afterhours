"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  adminResolveModeration,
  fetchIsAdmin,
  type ReportReason,
  type ReportTargetType,
} from "@/lib/contentReports";
import { AppSubpageHeader, APP_TAB_BOTTOM_PADDING_CLASS, navigateBack } from "@/components/AppSubpageHeader";
import { AuthScreenShell } from "@/components/AuthScreenShell";

type QueueStory = {
  kind: "story";
  id: string;
  image_url: string;
  is_share: boolean;
  created_at: string;
};

type QueueComment = {
  kind: "comment";
  id: string;
  content: string;
  created_at: string;
};

type QueueItem = QueueStory | QueueComment;

type ReportRow = {
  id: string;
  reason: ReportReason;
  details: string | null;
};

const REASON_LABELS: Record<ReportReason, string> = {
  spam: "Spam",
  harassment: "Harassment",
  hate: "Hate",
  nudity: "Nudity",
  violence: "Violence",
  impersonation: "Impersonation",
  other: "Other",
};

export default function AdminModerationPage() {
  const router = useRouter();
  const [me, setMe] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [reportsByKey, setReportsByKey] = useState<Record<string, ReportRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setMe(data.user.id);
      const isAdmin = await fetchIsAdmin(data.user.id);
      setAllowed(isAdmin);
      if (!isAdmin) {
        setLoading(false);
        return;
      }
      await loadQueue();
    })();
  }, [router]);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    const [storiesRes, commentsRes] = await Promise.all([
      supabase
        .from("stories")
        .select("id, image_url, is_share, created_at")
        .eq("moderation_status", "pending_review")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("story_comments")
        .select("id, content, created_at")
        .eq("moderation_status", "pending_review")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const queue: QueueItem[] = [];
    for (const s of storiesRes.data ?? []) {
      const url = String(s.image_url ?? "").trim();
      if (!url) continue;
      queue.push({
        kind: "story",
        id: s.id as string,
        image_url: url,
        is_share: !!s.is_share,
        created_at: s.created_at as string,
      });
    }
    for (const c of commentsRes.data ?? []) {
      queue.push({
        kind: "comment",
        id: c.id as string,
        content: String(c.content ?? ""),
        created_at: c.created_at as string,
      });
    }
    queue.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setItems(queue);

    const map: Record<string, ReportRow[]> = {};
    await Promise.all(
      queue.map(async (item) => {
        const type: ReportTargetType = item.kind === "story" ? "story" : "comment";
        const { data } = await supabase
          .from("content_reports")
          .select("id, reason, details")
          .eq("target_type", type)
          .eq("target_id", item.id);
        map[`${type}:${item.id}`] = (data ?? []) as ReportRow[];
      })
    );
    setReportsByKey(map);
    setLoading(false);
  }, []);

  const resolve = async (item: QueueItem, decision: "approve" | "remove") => {
    const type: ReportTargetType = item.kind === "story" ? "story" : "comment";
    setBusyId(item.id);
    const result = await adminResolveModeration({ targetType: type, targetId: item.id, decision });
    setBusyId(null);
    if (!result.ok) {
      alert(result.error ?? "Could not update");
      return;
    }
    await loadQueue();
  };

  if (allowed === false) {
    return (
      <AuthScreenShell>
        <AppSubpageHeader title="Admin" onBack={() => navigateBack(router, "/settings")} />
        <p className="mt-8 text-sm text-white/50 px-4">You don&apos;t have access to this area.</p>
      </AuthScreenShell>
    );
  }

  return (
    <AuthScreenShell>
      <AppSubpageHeader title="Moderation queue" onBack={() => navigateBack(router, "/settings")} />
      <div className={`px-4 pb-8 ${APP_TAB_BOTTOM_PADDING_CLASS}`}>
        {loading ? (
          <p className="text-sm text-white/50 mt-6">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-white/50 mt-6">Nothing pending review.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {items.map((item) => {
              const type: ReportTargetType = item.kind === "story" ? "story" : "comment";
              const key = `${type}:${item.id}`;
              const reports = reportsByKey[key] ?? [];
              const busy = busyId === item.id;
              const label =
                item.kind === "story" ? (item.is_share ? "Share" : "Moment") : "Comment";

              return (
                <li key={key} className="rounded-xl bg-white/5 p-4 space-y-3">
                  <p className="text-sm font-semibold text-white">
                    {label} · {reports.length} report{reports.length === 1 ? "" : "s"}
                  </p>
                  {item.kind === "story" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt=""
                      className="w-full max-h-64 object-cover rounded-lg bg-black/40"
                    />
                  ) : (
                    <p className="text-sm text-white/85 whitespace-pre-wrap">{item.content}</p>
                  )}
                  <ul className="text-xs text-white/45 space-y-1">
                    {reports.map((r) => (
                      <li key={r.id}>
                        · {REASON_LABELS[r.reason] ?? r.reason}
                        {r.details ? ` — ${r.details}` : ""}
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      className="flex-1 rounded-lg bg-white/15 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                      onClick={() => void resolve(item, "approve")}
                    >
                      Approve (show)
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="flex-1 rounded-lg bg-red-500/25 py-2.5 text-sm font-semibold text-red-200 disabled:opacity-50"
                      onClick={() => {
                        if (!confirm("Remove this content for users?")) return;
                        void resolve(item, "remove");
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <button
          type="button"
          className="mt-6 text-sm text-white/50 underline"
          onClick={() => void loadQueue()}
        >
          Refresh queue
        </button>
        {me ? (
          <p className="mt-8 text-[11px] text-white/30">Signed in as moderator · {me.slice(0, 8)}…</p>
        ) : null}
      </div>
    </AuthScreenShell>
  );
}
