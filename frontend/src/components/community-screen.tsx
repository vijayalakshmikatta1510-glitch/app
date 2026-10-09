import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { api, Challenge, CommunityGroup, CommunityPost, GroupStats, NearYou, User } from "@/src/api";
import { FamilySection } from "@/src/components/family-section";
import { colors } from "@/src/theme";

type Segment = "near" | "following" | "circles";

export function CommunityScreen({ user }: { user: User }) {
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [stats, setStats] = useState<Record<string, GroupStats>>({});
  const [nearYou, setNearYou] = useState<NearYou | null>(null);
  const [feed, setFeed] = useState<CommunityPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [segment, setSegment] = useState<Segment>("near");
  const [share, setShare] = useState(Boolean(user.circle_share));
  const [handle, setHandle] = useState(user.circle_handle ?? "");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [joinBusy, setJoinBusy] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [groupResult, nearResult] = await Promise.all([api.groups(), api.nearYou()]);
        setGroups(groupResult.groups);
        setNearYou(nearResult);
        const entries = await Promise.all(groupResult.groups.map(async (group) => [group.id, await api.groupStats(group.id)] as const));
        setStats(Object.fromEntries(entries));
      } catch {
        setMessage("We could not load circles right now.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (segment !== "following") return;
    setFeedLoading(true);
    api.followingPosts()
      .then((result) => setFeed(result.posts))
      .catch(() => setMessage("We could not load the people you follow."))
      .finally(() => setFeedLoading(false));
  }, [segment]);

  const toggleGroup = async (group: CommunityGroup) => {
    setJoinBusy(group.id);
    setMessage("");
    try {
      if (group.joined) await api.leaveGroup(group.id);
      else await api.joinGroup(group.id);
      setGroups((current) => current.map((item) => (item.id === group.id ? { ...item, joined: !item.joined } : item)));
      const nextStats = await api.groupStats(group.id);
      setStats((current) => ({ ...current, [group.id]: nextStats }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update membership.");
    } finally {
      setJoinBusy("");
    }
  };

  const toggleShare = async (value: boolean) => {
    setShare(value);
    try {
      const result = await api.updateSharing(value);
      setHandle(result.handle);
    } catch {
      setShare(!value);
      setMessage("We could not update your sharing choice.");
    }
  };

  const groupName = (id: string) => groups.find((group) => group.id === id)?.name ?? "Circle";
  const nearGroups = groups.filter((group) => group.city && group.city.toLowerCase() === user.city.toLowerCase());
  const joinedGroups = groups.filter((group) => group.joined);
  const visibleGroups = segment === "near" ? nearGroups : segment === "following" ? joinedGroups : groups;

  return (
    <ScrollView testID="community-screen" style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>PULSE CIRCLES</Text>
      <Text style={styles.title}>Pulse Circles</Text>
      <Text style={styles.subtitle}>Walk the 60 days alongside people like you. Anonymous, opt-in, never medical advice.</Text>

      {nearYou ? (
        <View style={styles.banner} testID="circles-banner">
          <Text style={styles.bannerTitle}>{nearYou.completed_today} {nearYou.completed_today === 1 ? "person" : "people"} near you completed today’s Pulse</Text>
          <Text style={styles.bannerCopy}>Your streak: {nearYou.streak} days. Keep the chain going.</Text>
        </View>
      ) : null}

      <FamilySection />

      <View style={styles.segments}>
        {([["near", "Near you"], ["following", "Following"], ["circles", "Circles"]] as const).map(([key, label]) => (
          <Pressable testID={`circles-tab-${key}`} key={key} onPress={() => setSegment(key)} style={[styles.segment, segment === key && styles.segmentActive]}>
            <Text style={[styles.segmentText, segment === key && styles.segmentTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {message ? <Text testID="community-screen-message" style={styles.error}>{message}</Text> : null}
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : (
        <View>
          {visibleGroups.map((group) => <GroupCard key={group.id} group={group} stats={stats[group.id]} joinBusy={joinBusy === group.id} onToggleJoin={() => toggleGroup(group)} />)}
          {!visibleGroups.length && segment === "near" ? (
            <View testID="circles-near-empty" style={styles.empty}>
              <Text style={styles.emptyTitle}>No circles in {user.city} yet</Text>
              <Text style={styles.emptyCopy}>Check the Circles tab for every group, wherever they are.</Text>
            </View>
          ) : null}
          {!visibleGroups.length && segment === "following" ? (
            <View testID="circles-following-empty" style={styles.empty}>
              <Text style={styles.emptyTitle}>You have not joined a circle yet</Text>
              <Text style={styles.emptyCopy}>Join a circle and its conversation will appear here.</Text>
            </View>
          ) : null}
          {segment === "following" && joinedGroups.length ? (
            <View testID="circles-following-feed" style={styles.feedCard}>
              <Text style={styles.feedTitle}>Latest from your circles</Text>
              {feedLoading ? (
                <ActivityIndicator color={colors.brandPrimary} style={styles.loader} />
              ) : feed.length ? (
                feed.map((post) => <PostRow key={post.id} post={post} groupName={groupName(post.group_id)} />)
              ) : (
                <Text style={styles.emptyCopy}>No posts yet. Open a circle and say hello.</Text>
              )}
            </View>
          ) : null}
        </View>
      )}

      <View style={styles.shareCard} testID="circles-share-card">
        <View style={styles.shareCopyWrap}>
          <Text style={styles.shareTitle}>Share my journey</Text>
          <Text style={styles.shareCopy}>{share ? `Opt-in. You appear as “${handle}”.` : "Off. Nobody sees your progress."}</Text>
        </View>
        <Switch testID="circles-share-toggle" value={share} onValueChange={toggleShare} trackColor={{ false: colors.borderStrong, true: colors.brandPrimary }} thumbColor={colors.surfaceSecondary} />
      </View>

      <Text style={styles.disclaimer}>Pulse Circles is peer support, not medical advice. Report content anytime. Doctors and family never see your Circle activity.</Text>
    </ScrollView>
  );
}

function PostRow({ post, groupName }: { post: CommunityPost; groupName: string }) {
  const [reported, setReported] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  if (blocked) return null;
  const report = async () => {
    setBusy(true);
    try {
      await api.reportPost(post.id);
      setReported(true);
    } catch {
      setReported(false);
    } finally {
      setBusy(false);
    }
  };
  const block = async () => {
    setBusy(true);
    try {
      await api.blockPostAuthor(post.id);
      setBlocked(true);
    } catch {
      setBlocked(false);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.post}>
      <Text style={styles.postGroup}>{groupName}</Text>
      <Text style={styles.postAuthor}>{post.author_name}</Text>
      <Text style={styles.postBody}>{post.body}</Text>
      <View style={styles.postActions}>
        {reported ? (
          <Text testID={`community-reported-${post.id}`} style={styles.reported}>Reported for review</Text>
        ) : (
          <Pressable testID={`community-report-${post.id}`} disabled={busy} onPress={report} style={styles.actionButton}>
            <Text style={styles.postAction}>Report</Text>
          </Pressable>
        )}
        <Pressable testID={`community-block-${post.id}`} disabled={busy} onPress={block} style={styles.actionButton}>
          <Text style={styles.postAction}>Block author</Text>
        </Pressable>
      </View>
    </View>
  );
}

function GroupCard({ group, stats, joinBusy, onToggleJoin }: { group: CommunityGroup; stats?: GroupStats; joinBusy: boolean; onToggleJoin: () => void }) {
  const [open, setOpen] = useState(false);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [note, setNote] = useState("");
  const [reportedIds, setReportedIds] = useState<string[]>([]);
  const [actionBusyId, setActionBusyId] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  useEffect(() => {
    if (!group.joined) {
      setChallenge(null);
      return;
    }
    api.groupChallenge(group.id).then((result) => setChallenge(result.challenge)).catch(() => undefined);
  }, [group.joined, group.id]);

  const progress = stats ? Math.min(1, stats.weekly_goal ? stats.checkins_this_week / stats.weekly_goal : 0) : 0;
  const ringProgress = challenge ? Math.min(1, challenge.target ? challenge.my_progress / challenge.target : 0) : 0;
  const RING_R = 26;
  const RING_C = 2 * Math.PI * RING_R;

  const toggleFeed = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setDraft("");
    setPostsLoading(true);
    try {
      setPosts((await api.posts(group.id)).posts);
    } catch {
      setNote("We could not load the conversation.");
    } finally {
      setPostsLoading(false);
    }
  };

  const submitPost = async () => {
    const body = draft.trim();
    if (!body) return;
    setPosting(true);
    setNote("");
    try {
      const post = await api.createPost({ group_id: group.id, body });
      setPosts((current) => [post, ...current]);
      setDraft("");
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not share your post.");
    } finally {
      setPosting(false);
    }
  };

  const reportPost = async (post: CommunityPost) => {
    setActionBusyId(post.id);
    setNote("");
    try {
      await api.reportPost(post.id);
      setReportedIds((current) => [...current, post.id]);
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not send the report.");
    } finally {
      setActionBusyId("");
    }
  };

  const blockAuthor = async (post: CommunityPost) => {
    setActionBusyId(post.id);
    setNote("");
    try {
      await api.blockPostAuthor(post.id);
      setPosts((current) => current.filter((item) => item.author_name !== post.author_name));
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not block this member.");
    } finally {
      setActionBusyId("");
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardCopy}>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.groupDetail}>{stats?.members ?? group.member_count ?? 0} members{group.city ? ` · ${group.city}` : ""} · {group.topic}</Text>
        </View>
        <Pressable testID={`community-join-${group.id}`} disabled={joinBusy} onPress={onToggleJoin} style={[styles.join, group.joined && styles.joined]}>
          <Text style={[styles.joinText, group.joined && styles.joinedText]}>{group.joined ? "Joined ✓" : "Join"}</Text>
        </Pressable>
      </View>
      {group.joined && challenge ? (
        <View style={styles.challengeCard} testID={`community-challenge-${group.id}`}>
          <View style={styles.ringWrap}>
            <Svg width={64} height={64} viewBox="0 0 64 64" style={styles.ringRotate}>
              <Circle cx={32} cy={32} r={RING_R} stroke={colors.border} strokeWidth={6} fill="none" />
              <Circle cx={32} cy={32} r={RING_R} stroke={colors.brandPrimary} strokeWidth={6} fill="none" strokeDasharray={RING_C} strokeDashoffset={RING_C * (1 - ringProgress)} strokeLinecap="round" />
            </Svg>
            <View style={styles.ringLabel}><Text style={styles.ringText}>{challenge.my_progress}/{challenge.target}</Text></View>
          </View>
          <View style={styles.challengeCopy}>
            <Text style={styles.challengeTitle}>{challenge.title}</Text>
            <Text style={styles.challengeMeta}>{challenge.participants} {challenge.participants === 1 ? "member" : "members"} in · ends {challenge.end_date} · group total {challenge.group_progress}</Text>
          </View>
        </View>
      ) : group.joined && stats ? (
        <View style={styles.challenge} testID={`community-challenge-${group.id}`}>
          <View style={styles.challengeRow}>
            <Text style={styles.challengeLabel}>Group goal · everyone checks in daily</Text>
            <Text style={styles.challengeCount}>{stats.checkins_this_week}/{stats.weekly_goal}</Text>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { flex: progress }]} /><View style={{ flex: 1 - progress }} /></View>
        </View>
      ) : null}
      {group.joined ? (
        <Pressable testID={`community-feed-toggle-${group.id}`} onPress={toggleFeed} style={styles.feedToggle}>
          <Text style={styles.feedToggleText}>{open ? "Hide conversation" : "View conversation"}</Text>
        </Pressable>
      ) : null}
      {open ? (
        <View testID={`community-feed-${group.id}`} style={styles.feed}>
          {note ? <Text style={styles.note}>{note}</Text> : null}
          {postsLoading ? (
            <ActivityIndicator color={colors.brandPrimary} style={styles.loader} />
          ) : posts.length ? (
            posts.map((post) => (
              <View key={post.id} style={styles.post}>
                <Text style={styles.postAuthor}>{post.author_name}</Text>
                <Text style={styles.postBody}>{post.body}</Text>
                <View style={styles.postActions}>
                  {reportedIds.includes(post.id) ? (
                    <Text testID={`community-reported-${post.id}`} style={styles.reported}>Reported for review</Text>
                  ) : (
                    <Pressable testID={`community-report-${post.id}`} disabled={actionBusyId === post.id} onPress={() => reportPost(post)} style={styles.actionButton}>
                      <Text style={styles.postAction}>Report</Text>
                    </Pressable>
                  )}
                  <Pressable testID={`community-block-${post.id}`} disabled={actionBusyId === post.id} onPress={() => blockAuthor(post)} style={styles.actionButton}>
                    <Text style={styles.postAction}>Block author</Text>
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyFeed}>No posts yet. Say hello to start the conversation.</Text>
          )}
          <View style={styles.composer}>
            <TextInput testID={`community-post-input-${group.id}`} value={draft} onChangeText={setDraft} placeholder="Share something helpful…" placeholderTextColor={colors.muted} style={styles.input} multiline maxLength={500} />
            <Pressable testID={`community-post-submit-${group.id}`} disabled={posting || !draft.trim()} onPress={submitPost} style={[styles.postButton, (posting || !draft.trim()) && styles.disabled]}>
              {posting ? <ActivityIndicator color={colors.onBrandPrimary} size="small" /> : <Text style={styles.postButtonText}>Post</Text>}
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 22, paddingBottom: 32 },
  eyebrow: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: colors.onSurface, fontSize: 30, fontWeight: "700", marginTop: 10 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8 },
  banner: { marginTop: 20, backgroundColor: colors.surfaceInverse, borderRadius: 18, padding: 18 },
  bannerTitle: { color: colors.onSurfaceInverse, fontSize: 16, fontWeight: "800", lineHeight: 22 },
  bannerCopy: { color: colors.brandTertiary, fontSize: 13, marginTop: 6 },
  segments: { flexDirection: "row", backgroundColor: colors.surfaceTertiary, borderRadius: 20, padding: 4, marginTop: 24, marginBottom: 16 },
  segment: { flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: 16 },
  segmentActive: { backgroundColor: colors.surfaceSecondary },
  segmentText: { color: colors.muted, fontWeight: "600", fontSize: 13 },
  segmentTextActive: { color: colors.brandPrimary, fontWeight: "700" },
  center: { minHeight: 160, alignItems: "center", justifyContent: "center" },
  error: { color: colors.error, marginTop: 14, lineHeight: 20 },
  card: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 14 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardCopy: { flex: 1 },
  groupName: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
  groupDetail: { color: colors.muted, marginTop: 4, lineHeight: 19, fontSize: 13 },
  join: { minHeight: 42, minWidth: 76, borderRadius: 21, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  joined: { backgroundColor: colors.brandTertiary },
  joinText: { color: colors.onBrandPrimary, fontWeight: "700" },
  joinedText: { color: colors.onBrandTertiary },
  challenge: { marginTop: 14 },
  challengeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 7 },
  challengeLabel: { color: colors.muted, fontSize: 12, fontWeight: "600", flex: 1, marginRight: 10 },
  challengeCount: { color: colors.onSurface, fontSize: 12, fontWeight: "800" },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceTertiary, flexDirection: "row", overflow: "hidden" },
  progressFill: { backgroundColor: colors.success, borderRadius: 4 },
  feedToggle: { minHeight: 40, justifyContent: "center" },
  feedToggleText: { color: colors.brandPrimary, fontWeight: "700", fontSize: 13 },
  feed: { backgroundColor: colors.surfaceTertiary, borderRadius: 14, padding: 14, marginTop: 4 },
  feedCard: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginTop: 6 },
  feedTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "700", marginBottom: 6 },
  note: { color: colors.muted, lineHeight: 19, marginBottom: 8 },
  loader: { marginVertical: 12 },
  post: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
  postGroup: { color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  postAuthor: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800", marginTop: 3 },
  postBody: { color: colors.onSurface, lineHeight: 20, marginTop: 4 },
  postActions: { flexDirection: "row", gap: 18, marginTop: 8 },
  actionButton: { minHeight: 32, justifyContent: "center" },
  postAction: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  reported: { color: colors.success, fontSize: 12, fontWeight: "700", alignSelf: "center" },
  emptyFeed: { color: colors.muted, lineHeight: 20, paddingVertical: 10 },
  composer: { marginTop: 12, gap: 10 },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.onSurface, padding: 12, fontSize: 14, textAlignVertical: "top" },
  postButton: { minHeight: 44, borderRadius: 22, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  postButtonText: { color: colors.onBrandPrimary, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  empty: { backgroundColor: colors.surfaceTertiary, padding: 20, borderRadius: 14, marginTop: 8 },
  emptyTitle: { color: colors.onSurface, fontWeight: "700", fontSize: 16 },
  emptyCopy: { color: colors.muted, lineHeight: 20, marginTop: 7 },
  shareCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginTop: 22 },
  shareCopyWrap: { flex: 1 },
  shareTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
  shareCopy: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  disclaimer: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 22, marginBottom: 8 },
  challengeCard: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 14, backgroundColor: colors.surfaceTertiary, borderRadius: 14, padding: 12 },
  ringWrap: { width: 64, height: 64 },
  ringRotate: { transform: [{ rotate: "-90deg" }] },
  ringLabel: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  ringText: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
  challengeCopy: { flex: 1 },
  challengeTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  challengeMeta: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4 },
});
