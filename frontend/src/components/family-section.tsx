import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { api, FamilyData, FamilyMember } from "@/src/api";
import { colors } from "@/src/theme";

export function FamilySection() {
  const [data, setData] = useState<FamilyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [familyName, setFamilyName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [nudgedIds, setNudgedIds] = useState<string[]>([]);
  const [nudgeBusy, setNudgeBusy] = useState("");
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState(false);

  const load = async () => {
    try {
      setData(await api.family());
    } catch {
      setMessageOk(false);
      setMessage("We could not load your family circle.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const run = async (action: () => Promise<{ message: string }>) => {
    setBusy(true);
    try {
      const result = await action();
      setMessageOk(true);
      setMessage(result.message);
      await load();
    } catch (error) {
      setMessageOk(false);
      setMessage(error instanceof Error ? error.message : "That did not work. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const create = () => {
    if (!familyName.trim()) {
      setMessageOk(false);
      setMessage("Give your family circle a name first.");
      return;
    }
    run(() => api.createFamily({ name: familyName.trim() })).then(() => setFamilyName(""));
  };

  const invite = () => {
    if (!inviteEmail.trim()) return;
    run(() => api.inviteFamily({ email: inviteEmail.trim() })).then(() => setInviteEmail(""));
  };

  const nudge = async (member: FamilyMember) => {
    setNudgeBusy(member.user_id);
    setMessage("");
    try {
      const result = await api.nudgeMember(member.user_id);
      setNudgedIds((current) => [...current, member.user_id]);
      setMessageOk(true);
      setMessage(result.message);
    } catch (error) {
      setMessageOk(false);
      setMessage(error instanceof Error ? error.message : "Could not send the nudge.");
    } finally {
      setNudgeBusy("");
    }
  };

  return (
    <View testID="family-section">
      <Text style={styles.sectionTitle}>Family circle</Text>
      <Text style={styles.sectionCopy}>A private circle for your family. Members can see each other's streaks, weekly check-ins, and latest Pulse Score — joining means agreeing to share these.</Text>
      {message ? <Text testID="family-message" style={messageOk ? styles.note : styles.error}>{message}</Text> : null}
      {loading ? (
        <ActivityIndicator color={colors.brandPrimary} style={styles.loader} />
      ) : data?.family ? (
        <View style={styles.card}>
          <Text style={styles.familyName}>{data.family.name}</Text>
          {data.nudges.length ? (
            <View testID="family-nudge-banner" style={styles.nudgeBanner}>
              <Text style={styles.nudgeBannerText}>{data.nudges[0].from_name} sent you a gentle nudge — a small check-in counts.</Text>
            </View>
          ) : null}
          {data.members.map((member) => (
            <View key={member.user_id} testID={`family-member-${member.user_id}`} style={styles.member}>
              <View style={styles.memberCopy}>
                <Text style={styles.memberName}>{member.name}{member.is_self ? " · you" : member.role === "admin" ? " · admin" : ""}</Text>
                <Text style={styles.memberStats}>{member.streak === 0 ? "streak paused · " : ""}{member.streak} day streak · {member.checkins_this_week} check-ins this week{member.latest_score !== null ? ` · score ${member.latest_score}` : " · no score yet"}</Text>
              </View>
              {!member.is_self ? (
                <Pressable testID={`family-nudge-${member.user_id}`} disabled={busy || nudgeBusy !== "" || nudgedIds.includes(member.user_id)} onPress={() => nudge(member)} style={[styles.nudgeButton, nudgedIds.includes(member.user_id) && styles.nudgeSent]}>
                  <Text style={[styles.nudgeText, nudgedIds.includes(member.user_id) && styles.nudgeSentText]}>{nudgedIds.includes(member.user_id) ? "Sent ✓" : nudgeBusy === member.user_id ? "…" : "Nudge"}</Text>
                </Pressable>
              ) : null}
              {data.is_admin && !member.is_self ? (
                <Pressable testID={`family-remove-${member.user_id}`} disabled={busy} onPress={() => run(() => api.removeFamilyMember(member.user_id))} style={styles.removeButton}>
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
          <Text style={styles.inviteLabel}>Invite a family member by email</Text>
          <View style={styles.inviteRow}>
            <TextInput testID="family-invite-email" value={inviteEmail} onChangeText={setInviteEmail} placeholder="their@email.com" placeholderTextColor={colors.muted} style={styles.input} keyboardType="email-address" autoCapitalize="none" />
            <Pressable testID="family-invite-send" disabled={busy || !inviteEmail.trim()} onPress={invite} style={[styles.smallAction, (busy || !inviteEmail.trim()) && styles.disabled]}>
              <Text style={styles.smallActionText}>Invite</Text>
            </Pressable>
          </View>
          {data.invites_sent.length ? (
            <View>
              {data.invites_sent.map((invite) => <Text key={invite.id} style={styles.pending}>Invite pending · {invite.email}</Text>)}
            </View>
          ) : null}
          <Pressable testID="family-leave" disabled={busy} onPress={() => run(() => api.leaveFamily())} style={styles.leaveButton}>
            <Text style={styles.leaveText}>{data.is_admin ? "Close circle" : "Leave circle"}</Text>
          </Pressable>
        </View>
      ) : (
        <View>
          {data?.invites_received.length ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>You are invited</Text>
              {data.invites_received.map((invite) => (
                <View key={invite.id} style={styles.invite}>
                  <Text style={styles.inviteText}>{invite.from_name} invited you to {invite.family_name}</Text>
                  <View style={styles.inviteActions}>
                    <Pressable testID={`family-accept-${invite.id}`} disabled={busy} onPress={() => run(() => api.acceptFamilyInvite(invite.id))} style={styles.smallAction}>
                      <Text style={styles.smallActionText}>Accept</Text>
                    </Pressable>
                    <Pressable testID={`family-decline-${invite.id}`} disabled={busy} onPress={() => run(() => api.declineFamilyInvite(invite.id))} style={styles.declineButton}>
                      <Text style={styles.declineText}>Decline</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Start your family circle</Text>
            <TextInput testID="family-name-input" value={familyName} onChangeText={setFamilyName} placeholder="e.g. The Sharma Family" placeholderTextColor={colors.muted} style={styles.input} maxLength={60} />
            <Pressable testID="family-create" disabled={busy || !familyName.trim()} onPress={create} style={[styles.createButton, (busy || !familyName.trim()) && styles.disabled]}>
              <Text style={styles.createText}>Create circle</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "700", marginTop: 30, marginBottom: 8 },
  sectionCopy: { color: colors.muted, lineHeight: 21, marginBottom: 12 },
  loader: { marginTop: 16 },
  error: { color: colors.error, marginTop: 8, lineHeight: 20 },
  note: { color: colors.info, marginTop: 8, lineHeight: 20 },
  card: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginTop: 8 },
  cardTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "700", marginBottom: 10 },
  familyName: { color: colors.brandPrimary, fontSize: 18, fontWeight: "800", marginBottom: 10 },
  nudgeBanner: { backgroundColor: colors.brandTertiary, borderRadius: 12, padding: 12, marginBottom: 10 },
  nudgeBannerText: { color: colors.onBrandTertiary, fontSize: 13, lineHeight: 19, fontWeight: "600" },
  member: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  memberCopy: { flex: 1 },
  memberName: { color: colors.onSurface, fontWeight: "700" },
  memberStats: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  nudgeButton: { minHeight: 36, minWidth: 64, borderRadius: 18, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  nudgeSent: { backgroundColor: colors.brandTertiary },
  nudgeText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: 12 },
  nudgeSentText: { color: colors.onBrandTertiary },
  removeButton: { minHeight: 36, minWidth: 64, borderRadius: 18, borderWidth: 1, borderColor: colors.error, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  removeText: { color: colors.error, fontWeight: "700", fontSize: 12 },
  inviteLabel: { color: colors.onSurface, fontSize: 13, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  inviteRow: { flexDirection: "row", gap: 10 },
  input: { flex: 1, minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.onSurface, paddingHorizontal: 14, fontSize: 14 },
  smallAction: { minHeight: 46, borderRadius: 23, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  smallActionText: { color: colors.onBrandPrimary, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  pending: { color: colors.muted, fontSize: 12, marginTop: 10 },
  leaveButton: { minHeight: 42, borderRadius: 21, borderWidth: 1, borderColor: colors.error, alignItems: "center", justifyContent: "center", marginTop: 16 },
  leaveText: { color: colors.error, fontWeight: "700", fontSize: 13 },
  invite: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
  inviteText: { color: colors.onSurface, lineHeight: 20 },
  inviteActions: { flexDirection: "row", gap: 10, marginTop: 10 },
  declineButton: { minHeight: 46, borderRadius: 23, borderWidth: 1, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  declineText: { color: colors.onSurfaceSecondary, fontWeight: "700" },
  createButton: { minHeight: 46, borderRadius: 23, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", marginTop: 12 },
  createText: { color: colors.onBrandPrimary, fontWeight: "700" },
});
