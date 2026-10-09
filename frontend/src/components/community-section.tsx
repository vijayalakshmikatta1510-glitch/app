import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { api, CommunityGroup, CommunityPost } from "@/src/api";
import { colors } from "@/src/theme";

export function CommunitySection() {
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState(false);
  const [openGroupId, setOpenGroupId] = useState("");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [reportedIds, setReportedIds] = useState<string[]>([]);
  const [actionBusyId, setActionBusyId] = useState("");

  useEffect(() => {
    api.groups().then((result) => setGroups(result.groups)).catch(() => { setMessageOk(false); setMessage("We could not load communities."); }).finally(() => setLoading(false));
  }, []);

  const fail = (error: unknown, fallback: string) => {
    setMessageOk(false);
    setMessage(error instanceof Error ? error.message : fallback);
  };

  const toggleGroup = async (group: CommunityGroup) => {
    setBusy(true);
    try {
      if (group.joined) await api.leaveGroup(group.id);
      else await api.joinGroup(group.id);
      setGroups((current) => current.map((item) => (item.id === group.id ? { ...item, joined: !item.joined } : item)));
      if (group.joined && openGroupId === group.id) setOpenGroupId("");
    } catch (error) {
      fail(error, "Could not update membership.");
    } finally {
      setBusy(false);
    }
  };

  const toggleFeed = async (group: CommunityGroup) => {
    if (openGroupId === group.id) {
      setOpenGroupId("");
      return;
    }
    setOpenGroupId(group.id);
    setDraft("");
    setPostsLoading(true);
    try {
      setPosts((await api.posts(group.id)).posts);
    } catch (error) {
      fail(error, "We could not load the conversation.");
    } finally {
      setPostsLoading(false);
    }
  };

  const submitPost = async (group: CommunityGroup) => {
    const body = draft.trim();
    if (!body) return;
    setPosting(true);
    try {
      const post = await api.createPost({ group_id: group.id, body });
      setPosts((current) => [post, ...current]);
      setDraft("");
    } catch (error) {
      fail(error, "Could not share your post.");
    } finally {
      setPosting(false);
    }
  };

  const reportPost = async (post: CommunityPost) => {
    setActionBusyId(post.id);
    try {
      await api.reportPost(post.id);
      setReportedIds((current) => [...current, post.id]);
      setMessageOk(true);
      setMessage("Thanks — this post has been flagged for review.");
    } catch (error) {
      fail(error, "Could not send the report.");
    } finally {
      setActionBusyId("");
    }
  };

  const blockAuthor = async (post: CommunityPost) => {
    setActionBusyId(post.id);
    try {
      await api.blockPostAuthor(post.id);
      setPosts((current) => current.filter((item) => item.author_name !== post.author_name));
      setMessageOk(true);
      setMessage("You will no longer see posts from this member.");
    } catch (error) {
      fail(error, "Could not block this member.");
    } finally {
      setActionBusyId("");
    }
  };

  return (
    <View testID="community-section">
      <Text style={styles.sectionTitle}>Community</Text>
      {message ? <Text testID="community-message" style={messageOk ? styles.note : styles.error}>{message}</Text> : null}
      {loading ? (
        <ActivityIndicator color={colors.brandPrimary} style={styles.loader} />
      ) : groups.length ? (
        groups.map((group) => (
          <View key={group.id} style={styles.groupBlock}>
            <View style={styles.group}>
              <View style={styles.groupCopy}>
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.groupDetail}>{group.topic}{group.city ? ` · ${group.city}` : ""}</Text>
              </View>
              <Pressable testID={`community-join-${group.id}`} disabled={busy} onPress={() => toggleGroup(group)} style={[styles.join, group.joined && styles.joined]}>
                <Text style={[styles.joinText, group.joined && styles.joinedText]}>{group.joined ? "Joined" : "Join"}</Text>
              </Pressable>
            </View>
            {group.joined ? (
              <Pressable testID={`community-feed-toggle-${group.id}`} onPress={() => toggleFeed(group)} style={styles.feedToggle}>
                <Text style={styles.feedToggleText}>{openGroupId === group.id ? "Hide conversation" : "View conversation"}</Text>
              </Pressable>
            ) : null}
            {openGroupId === group.id ? (
              <View testID={`community-feed-${group.id}`} style={styles.feed}>
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
                  <Pressable testID={`community-post-submit-${group.id}`} disabled={posting || !draft.trim()} onPress={() => submitPost(group)} style={[styles.postButton, (posting || !draft.trim()) && styles.disabled]}>
                    {posting ? <ActivityIndicator color={colors.onBrandPrimary} size="small" /> : <Text style={styles.postButtonText}>Post</Text>}
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        ))
      ) : (
        <View testID="community-empty" style={styles.empty}>
          <Text style={styles.emptyTitle}>No communities available yet</Text>
          <Text style={styles.emptyCopy}>Groups will appear here when the directory has verified records. Your health data is never used for discovery.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "700", marginTop: 30, marginBottom: 8 },
  loader: { marginTop: 16 },
  error: { color: colors.error, marginTop: 8, lineHeight: 20 },
  note: { color: colors.info, marginTop: 8, lineHeight: 20 },
  groupBlock: { borderBottomWidth: 1, borderBottomColor: colors.divider, paddingBottom: 6 },
  group: { paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  groupCopy: { flex: 1 },
  groupName: { color: colors.onSurface, fontWeight: "700" },
  groupDetail: { color: colors.muted, marginTop: 4, lineHeight: 19 },
  join: { minHeight: 42, minWidth: 72, borderRadius: 21, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  joined: { backgroundColor: colors.brandTertiary },
  joinText: { color: colors.onBrandPrimary, fontWeight: "700" },
  joinedText: { color: colors.onBrandTertiary },
  feedToggle: { minHeight: 40, justifyContent: "center" },
  feedToggleText: { color: colors.brandPrimary, fontWeight: "700", fontSize: 13 },
  feed: { backgroundColor: colors.surfaceTertiary, borderRadius: 14, padding: 14, marginTop: 4, marginBottom: 10 },
  post: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
  postAuthor: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800" },
  postBody: { color: colors.onSurface, lineHeight: 20, marginTop: 4 },
  postActions: { flexDirection: "row", gap: 18, marginTop: 8 },
  actionButton: { minHeight: 32, justifyContent: "center" },
  postAction: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  reported: { color: colors.success, fontSize: 12, fontWeight: "700", alignSelf: "center" },
  emptyFeed: { color: colors.muted, lineHeight: 20, paddingVertical: 10 },
  composer: { marginTop: 12, gap: 10 },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.onSurface, padding: 12, fontSize: 14, textAlignVertical: "top" },
  postButton: { minHeight: 44, borderRadius: 22, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  postButtonText: { color: colors.onBrandPrimary, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  empty: { backgroundColor: colors.surfaceTertiary, padding: 20, borderRadius: 14, marginTop: 8 },
  emptyTitle: { color: colors.onSurface, fontWeight: "700", fontSize: 16 },
  emptyCopy: { color: colors.muted, lineHeight: 20, marginTop: 7 },
});
