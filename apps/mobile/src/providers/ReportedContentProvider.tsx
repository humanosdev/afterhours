import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchMyReportedCommentIds,
  fetchMyReportedStoryIds,
} from "../lib/contentReports";
import { useAuth } from "./AuthProvider";

type ReportedContentContextValue = {
  isStoryReported: (storyId: string) => boolean;
  isCommentReported: (commentId: string) => boolean;
  markStoryReported: (storyId: string) => void;
  markCommentReported: (commentId: string) => void;
  reloadReportedContent: () => Promise<void>;
};

const ReportedContentContext = createContext<ReportedContentContextValue | null>(null);

export function useReportedContent(): ReportedContentContextValue {
  const ctx = useContext(ReportedContentContext);
  if (!ctx) throw new Error("useReportedContent must be used within ReportedContentProvider");
  return ctx;
}

export function ReportedContentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [reportedStoryIds, setReportedStoryIds] = useState<Set<string>>(() => new Set());
  const [reportedCommentIds, setReportedCommentIds] = useState<Set<string>>(() => new Set());

  const reloadReportedContent = useCallback(async () => {
    if (!user?.id) {
      setReportedStoryIds(new Set());
      setReportedCommentIds(new Set());
      return;
    }
    const [storyIds, commentIds] = await Promise.all([
      fetchMyReportedStoryIds(),
      fetchMyReportedCommentIds(),
    ]);
    setReportedStoryIds(new Set(storyIds));
    setReportedCommentIds(new Set(commentIds));
  }, [user?.id]);

  useEffect(() => {
    void reloadReportedContent();
  }, [reloadReportedContent]);

  const markStoryReported = useCallback((storyId: string) => {
    if (!storyId) return;
    setReportedStoryIds((prev) => {
      if (prev.has(storyId)) return prev;
      const next = new Set(prev);
      next.add(storyId);
      return next;
    });
  }, []);

  const markCommentReported = useCallback((commentId: string) => {
    if (!commentId) return;
    setReportedCommentIds((prev) => {
      if (prev.has(commentId)) return prev;
      const next = new Set(prev);
      next.add(commentId);
      return next;
    });
  }, []);

  const isStoryReported = useCallback(
    (storyId: string) => reportedStoryIds.has(storyId),
    [reportedStoryIds]
  );

  const isCommentReported = useCallback(
    (commentId: string) => reportedCommentIds.has(commentId),
    [reportedCommentIds]
  );

  const value = useMemo(
    () => ({
      isStoryReported,
      isCommentReported,
      markStoryReported,
      markCommentReported,
      reloadReportedContent,
    }),
    [isStoryReported, isCommentReported, markStoryReported, markCommentReported, reloadReportedContent]
  );

  return <ReportedContentContext.Provider value={value}>{children}</ReportedContentContext.Provider>;
}
