import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  groupStoryEngagementFeedItems,
  isGroupedStoryEngagementFeedRow,
  shouldSendPushForStoryEngagement,
  storyEngagementGroupedMessage,
  STORY_ENGAGEMENT_FEED_GROUP_MIN_DISTINCT_ACTORS,
} from "./storyEngagementGrouping";

function likeRow(
  id: string,
  actorId: string,
  storyId: string,
  createdAt: string,
  storyIsShare = true
) {
  return {
    id,
    actor_user_id: actorId,
    story_id: storyId,
    story_is_share: storyIsShare,
    type: "story_like" as const,
    created_at: createdAt,
    read: false,
    actor_display_name: `User ${actorId}`,
    actor_username: actorId,
    actor_avatar_url: null,
  };
}

describe("storyEngagementGrouping", () => {
  it("keeps up to three distinct likers as separate feed rows", () => {
    const storyId = "s1";
    const items = [
      likeRow("1", "a", storyId, "2026-01-01T10:00:00Z"),
      likeRow("2", "b", storyId, "2026-01-01T10:01:00Z"),
      likeRow("3", "c", storyId, "2026-01-01T10:02:00Z"),
    ];
    const out = groupStoryEngagementFeedItems(items);
    assert.equal(out.length, 3);
    assert.ok(!out.some((r) => r.id.startsWith("group:")));
  });

  it("bundles four distinct likers into one grouped row", () => {
    const storyId = "s1";
    const items = [
      likeRow("1", "a", storyId, "2026-01-01T10:00:00Z"),
      likeRow("2", "b", storyId, "2026-01-01T10:01:00Z"),
      likeRow("3", "c", storyId, "2026-01-01T10:02:00Z"),
      likeRow("4", "d", storyId, "2026-01-01T10:03:00Z"),
    ];
    const out = groupStoryEngagementFeedItems(items);
    assert.equal(out.length, 1);
    assert.equal(out[0]!.id, `group:story_like:${storyId}`);
    assert.equal(out[0]!.group_actor_count, 4);
    assert.equal(isGroupedStoryEngagementFeedRow(out[0]!), true);
    assert.equal(out[0]!.actor_display_name, "User d");
    assert.equal(out[0]!.grouped_row_ids?.length, 4);
  });

  it("bundles moment likes with moment copy", () => {
    const storyId = "m1";
    const items = [
      likeRow("1", "a", storyId, "2026-01-01T10:00:00Z", false),
      likeRow("2", "b", storyId, "2026-01-01T10:01:00Z", false),
      likeRow("3", "c", storyId, "2026-01-01T10:02:00Z", false),
      likeRow("4", "d", storyId, "2026-01-01T10:03:00Z", false),
    ];
    const out = groupStoryEngagementFeedItems(items);
    assert.equal(out.length, 1);
    assert.equal(out[0]!.story_is_share, false);
  });

  it("uses share vs moment copy for grouped likes", () => {
    assert.equal(
      storyEngagementGroupedMessage("story_like", "Alex", "share"),
      "Alex and others liked your share"
    );
    assert.equal(
      storyEngagementGroupedMessage("story_like", "Alex", "moment"),
      "Alex and others liked your moment"
    );
  });

  it("suppresses push from the fourth distinct actor onward", () => {
    assert.equal(shouldSendPushForStoryEngagement(3), true);
    assert.equal(shouldSendPushForStoryEngagement(4), false);
    assert.equal(STORY_ENGAGEMENT_FEED_GROUP_MIN_DISTINCT_ACTORS, 4);
  });
});
