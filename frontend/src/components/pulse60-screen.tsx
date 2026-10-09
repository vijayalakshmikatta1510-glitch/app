import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE, api, Benefits, CommunityGroup, PulseSummary, TOKEN_KEY, UploadRecord } from "@/src/api";
import { storage } from "@/src/utils/storage";
import { colors } from "@/src/theme";

const MAX_BYTES = 10 * 1024 * 1024;

export function Pulse60Screen() {
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<PulseSummary | null>(null);
  const [movement, setMovement] = useState("Some movement");
  const [nourishment, setNourishment] = useState("Nourished");
  const [wellbeing, setWellbeing] = useState("Checked in");
  const [reflection, setReflection] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState(true);
  const [benefits, setBenefits] = useState<Benefits | null>(null);
  const [claimBusy, setClaimBusy] = useState(false);
  const [evidence, setEvidence] = useState<UploadRecord[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [evidenceBusy, setEvidenceBusy] = useState("");
  const [photoExplain, setPhotoExplain] = useState<"" | "food" | "steps">("");
  const [showSettings, setShowSettings] = useState(false);
  const [joinedGroups, setJoinedGroups] = useState<CommunityGroup[]>([]);
  const [sharedTo, setSharedTo] = useState<string[]>([]);
  const [shareBusy, setShareBusy] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    Promise.all([api.pulse(), api.benefits(), api.uploads(), api.groups()])
      .then(([pulseResult, benefitResult, uploadResult, groupResult]) => {
        setSummary(pulseResult);
        setBenefits(benefitResult);
        setEvidence(uploadResult.uploads.filter((item) => item.purpose === "pulse60_evidence" && item.confirmed_date === today));
        setJoinedGroups(groupResult.groups.filter((group) => group.joined));
      })
      .catch(() => {
        setMessageOk(false);
        setMessage("We could not load your check-ins.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    evidence.forEach((item) => {
      if (thumbs[item.id]) return;
      (async () => {
        try {
          const token = await storage.secureGet<string | null>(TOKEN_KEY, null);
          const response = await fetch(`${API_BASE}/uploads/${item.id}/download`, { headers: { Authorization: `Bearer ${token ?? ""}` } });
          if (!response.ok) return;
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onload = () => setThumbs((current) => ({ ...current, [item.id]: reader.result as string }));
          reader.readAsDataURL(blob);
        } catch {
          // Thumbnails are optional; the record still shows.
        }
      })();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evidence]);

  const save = async () => {
    setBusy(true);
    setMessage("");
    try {
      const result = await api.savePulse({ check_in_date: today, movement, nourishment, wellbeing, reflection: reflection || null, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" });
      setSummary(result.summary);
      setBenefits(await api.benefits());
      setMessageOk(true);
      setMessage("Saved for today.");
    } catch (error) {
      setMessageOk(false);
      setMessage(error instanceof Error ? error.message : "We could not save this check-in.");
    } finally {
      setBusy(false);
    }
  };

  const claim = async () => {
    setClaimBusy(true);
    try {
      await api.claimBenefits();
      setBenefits(await api.benefits());
      setMessageOk(true);
      setMessage("Benefits claimed — our care team will reach out to arrange them.");
    } catch (error) {
      setMessageOk(false);
      setMessage(error instanceof Error ? error.message : "Could not claim benefits yet.");
    } finally {
      setClaimBusy(false);
    }
  };

  const pickEvidence = async (kind: "food" | "steps") => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    if (asset.fileSize && asset.fileSize > MAX_BYTES) {
      setMessageOk(false);
      setMessage("That file is larger than 10 MB.");
      return;
    }
    const form = new FormData();
    if (Platform.OS === "web") {
      const blob = await (await fetch(asset.uri)).blob();
      form.append("file", blob, asset.fileName ?? `${kind}.jpg`);
    } else {
      form.append("file", { uri: asset.uri, name: asset.fileName ?? `${kind}.jpg`, type: asset.mimeType ?? "image/jpeg" } as unknown as Blob);
    }
    form.append("purpose", "pulse60_evidence");
    form.append("confirmed_date", today);
    setEvidenceBusy(kind);
    try {
      const record = await api.uploadReport(form);
      setEvidence((current) => [record, ...current]);
      setMessageOk(true);
      setMessage(`${kind === "food" ? "Food" : "Steps"} photo saved privately to today's check-in.`);
    } catch (error) {
      setMessageOk(false);
      setMessage(error instanceof Error ? error.message : "Could not save that photo.");
    } finally {
      setEvidenceBusy("");
    }
  };

  const addEvidence = async (kind: "food" | "steps") => {
    setMessage("");
    if (Platform.OS !== "web") {
      const current = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (!current.granted) {
        if (!current.canAskAgain) {
          setShowSettings(true);
          setMessageOk(false);
          setMessage("Photo access is off. Enable it in Settings to add evidence photos.");
          return;
        }
        setPhotoExplain(kind);
        return;
      }
    }
    await pickEvidence(kind);
  };

  const confirmPhotoPermission = async () => {
    const kind = photoExplain;
    setPhotoExplain("");
    const response = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (response.granted && kind) {
      await pickEvidence(kind);
      return;
    }
    if (!response.canAskAgain) setShowSettings(true);
    setMessageOk(false);
    setMessage("Without photo access you can still complete your check-in.");
  };

  const shareWin = async (group: CommunityGroup) => {
    setShareBusy(group.id);
    setMessage("");
    try {
      await api.createPost({ group_id: group.id, body: `Completed today's Pulse 60 check-in · ${summary?.streak ?? 0} day streak` });
      setSharedTo((current) => [...current, group.id]);
    } catch (error) {
      setMessageOk(false);
      setMessage(error instanceof Error ? error.message : "Could not share right now.");
    } finally {
      setShareBusy("");
    }
  };

  const benefitProgress = benefits ? Math.min(1, benefits.streak / benefits.target) : 0;

  return (
    <ScrollView testID="pulse60-screen" style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>PULSE 60</Text>
      <Text style={styles.title}>One minute for yourself.</Text>
      <Text style={styles.subtitle}>Notice the small things. A photo is never required for a check-in to count.</Text>

      <View style={styles.streakCard}>
        <Text style={styles.cardLabel}>CURRENT STREAK</Text>
        <Text style={styles.streak}>{summary?.streak ?? 0}<Text style={styles.streakUnit}> days</Text></Text>
        <Text style={styles.cardNote}>Your progress is recalculated from saved check-ins.</Text>
      </View>

      {benefits ? (
        <View style={styles.benefitCard} testID="pulse60-benefits">
          <Text style={styles.benefitEyebrow}>60-DAY STREAK REWARD</Text>
          {benefits.unlocked ? (
            <View>
              <Text style={styles.benefitTitle}>{benefits.claimed ? "Free medical benefits unlocked" : "You did it — benefits unlocked"}</Text>
              {benefits.benefits.map((benefit) => <Text key={benefit} style={styles.benefitItem}>· {benefit}</Text>)}
              {benefits.claimed ? (
                <Text testID="pulse60-claimed" style={styles.benefitClaimed}>Claimed · our care team will arrange these with you</Text>
              ) : (
                <Pressable testID="pulse60-claim" disabled={claimBusy} onPress={claim} style={[styles.claimButton, claimBusy && styles.disabled]}>
                  <Text style={styles.claimText}>{claimBusy ? "Claiming…" : "Claim free benefits"}</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View>
              <Text style={styles.benefitTitle}>{benefits.streak} of {benefits.target} days</Text>
              <Text style={styles.benefitCopy}>Complete a 60-day streak to unlock free medical benefits.</Text>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { flex: benefitProgress }]} /><View style={{ flex: 1 - benefitProgress }} /></View>
            </View>
          )}
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Today’s check-in</Text>
      <Choice label="Movement" value={movement} options={["Some movement", "A lot of movement", "Rest day"]} onChange={setMovement} />
      <Choice label="Nourishment" value={nourishment} options={["Nourished", "Learning", "Taking it easy"]} onChange={setNourishment} />
      <Choice label="Wellbeing" value={wellbeing} options={["Checked in", "Need a pause", "Need support"]} onChange={setWellbeing} />

      <Text style={styles.sectionTitle}>Today’s evidence (optional)</Text>
      <Text style={styles.hint}>Add a photo of your food or your step count — only if it helps you remember. Photos stay private.</Text>
      <View style={styles.evidenceRow}>
        <Pressable testID="pulse60-evidence-food" disabled={evidenceBusy !== ""} onPress={() => addEvidence("food")} style={({ pressed }) => [styles.evidenceButton, pressed && styles.pressed, evidenceBusy !== "" && styles.disabled]}>
          {evidenceBusy === "food" ? <ActivityIndicator color={colors.onBrandPrimary} size="small" /> : <Text style={styles.evidenceButtonText}>Add food photo</Text>}
        </Pressable>
        <Pressable testID="pulse60-evidence-steps" disabled={evidenceBusy !== ""} onPress={() => addEvidence("steps")} style={({ pressed }) => [styles.evidenceButton, styles.evidenceButtonAlt, pressed && styles.pressed, evidenceBusy !== "" && styles.disabled]}>
          {evidenceBusy === "steps" ? <ActivityIndicator color={colors.onBrandTertiary} size="small" /> : <Text style={[styles.evidenceButtonText, styles.evidenceButtonAltText]}>Add steps photo</Text>}
        </Pressable>
      </View>
      {photoExplain ? (
        <View testID="pulse60-photo-explain" style={styles.explain}>
          <Text style={styles.explainText}>Pulse needs photo access only to attach the evidence photos you choose. Nothing is uploaded without you picking it.</Text>
          <Pressable testID="pulse60-photo-continue" onPress={confirmPhotoPermission} style={styles.claimButton}>
            <Text style={styles.claimText}>Continue</Text>
          </Pressable>
        </View>
      ) : null}
      {showSettings ? (
        <Pressable testID="pulse60-open-settings" onPress={() => Linking.openSettings()} style={styles.settingsButton}>
          <Text style={styles.settingsText}>Open Settings</Text>
        </Pressable>
      ) : null}
      {evidence.length ? (
        <View testID="pulse60-evidence-list" style={styles.thumbRow}>
          {evidence.map((item) => (
            <View key={item.id} style={styles.thumbWrap}>
              {thumbs[item.id] ? <Image source={{ uri: thumbs[item.id] }} style={styles.thumb} contentFit="cover" /> : <View style={[styles.thumb, styles.thumbLoading]}><ActivityIndicator color={colors.brandPrimary} size="small" /></View>}
              <Text style={styles.thumbLabel} numberOfLines={1}>{item.original_name}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.label}>Optional reflection</Text>
      <TextInput testID="pulse60-reflection-input" value={reflection} onChangeText={setReflection} placeholder="Anything you want to remember?" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} multiline maxLength={500} />
      {message ? <Text testID="pulse60-message" style={messageOk ? styles.message : styles.errorText}>{message}</Text> : null}
      <Pressable testID="pulse60-save-button" disabled={busy} onPress={save} style={({ pressed }) => [styles.action, pressed && styles.pressed, busy && styles.disabled]}>
        {busy ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.actionText}>{summary?.today ? "Update today’s check-in" : "Save today’s check-in"}</Text>}
      </Pressable>

      {summary?.today && joinedGroups.length ? (
        <View style={styles.shareBlock}>
          <Text style={styles.label}>Share today’s win to a circle</Text>
          <View style={styles.shareRow}>
            {joinedGroups.map((group) => (
              <Pressable testID={`pulse60-share-${group.id}`} key={group.id} disabled={shareBusy !== "" || sharedTo.includes(group.id)} onPress={() => shareWin(group)} style={[styles.shareChip, sharedTo.includes(group.id) && styles.shareChipDone]}>
                <Text style={[styles.shareChipText, sharedTo.includes(group.id) && styles.shareChipTextDone]}>{sharedTo.includes(group.id) ? "Shared ✓" : shareBusy === group.id ? "Sharing…" : group.name}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.hint}>Shared under your anonymous circle name, never your real name.</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Last seven days</Text>
      <View style={styles.weekRow}>
        {(summary?.days ?? []).map((day) => (
          <View key={day.date} style={styles.day}>
            <View style={[styles.dayDot, day.complete && styles.complete]}><Text style={styles.check}>{day.complete ? "✓" : ""}</Text></View>
            <Text style={styles.dayLabel}>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function Choice({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <View style={styles.choice}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choiceRow}>
        {options.map((option) => (
          <Pressable testID={`pulse60-choice-${label.toLowerCase()}-${option}`} key={option} onPress={() => onChange(option)} style={[styles.chip, value === option && styles.chipActive]}>
            <Text style={[styles.chipText, value === option && styles.chipTextActive]}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 22, paddingBottom: 32 },
  eyebrow: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: colors.onSurface, fontSize: 30, fontWeight: "700", marginTop: 10 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8 },
  streakCard: { marginTop: 24, backgroundColor: colors.surfaceInverse, borderRadius: 20, padding: 22 },
  cardLabel: { color: colors.brandTertiary, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  streak: { color: colors.onSurfaceInverse, fontSize: 54, fontWeight: "800", marginTop: 5 },
  streakUnit: { fontSize: 19, fontWeight: "500" },
  cardNote: { color: colors.muted, marginTop: 5 },
  benefitCard: { marginTop: 18, backgroundColor: colors.brandTertiary, borderRadius: 18, padding: 18 },
  benefitEyebrow: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  benefitTitle: { color: colors.onBrandTertiary, fontSize: 17, fontWeight: "700", marginTop: 8 },
  benefitCopy: { color: colors.onBrandTertiary, fontSize: 13, lineHeight: 19, marginTop: 4, opacity: 0.85 },
  benefitItem: { color: colors.onBrandTertiary, fontSize: 13, lineHeight: 21, marginTop: 4 },
  benefitClaimed: { color: colors.onBrandTertiary, fontSize: 13, fontWeight: "700", marginTop: 10 },
  claimButton: { minHeight: 44, borderRadius: 22, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", marginTop: 12 },
  claimText: { color: colors.onBrandPrimary, fontWeight: "700" },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.surface, flexDirection: "row", overflow: "hidden", marginTop: 12 },
  progressFill: { backgroundColor: colors.brandPrimary, borderRadius: 4 },
  sectionTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "700", marginTop: 30, marginBottom: 16 },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: -8, marginBottom: 12 },
  choice: { marginBottom: 17 },
  label: { color: colors.onSurface, fontSize: 13, fontWeight: "700", marginBottom: 8 },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 42, paddingHorizontal: 13, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, justifyContent: "center" },
  chipActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  chipText: { color: colors.onSurfaceSecondary, fontSize: 13 },
  chipTextActive: { color: colors.onBrandTertiary, fontWeight: "700" },
  evidenceRow: { flexDirection: "row", gap: 10 },
  evidenceButton: { flex: 1, minHeight: 46, borderRadius: 23, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  evidenceButtonAlt: { backgroundColor: colors.brandTertiary },
  evidenceButtonText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: 13 },
  evidenceButtonAltText: { color: colors.onBrandTertiary },
  explain: { backgroundColor: colors.surfaceTertiary, borderRadius: 14, padding: 16, marginTop: 14 },
  explainText: { color: colors.onSurfaceSecondary, lineHeight: 20 },
  settingsButton: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", marginTop: 14 },
  settingsText: { color: colors.brandPrimary, fontWeight: "700" },
  thumbRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 },
  thumbWrap: { width: 96 },
  thumb: { width: 96, height: 96, borderRadius: 14, backgroundColor: colors.surfaceTertiary },
  thumbLoading: { alignItems: "center", justifyContent: "center" },
  thumbLabel: { color: colors.muted, fontSize: 11, marginTop: 5 },
  input: { minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.onSurface, padding: 14, fontSize: 15 },
  multiline: { minHeight: 92, textAlignVertical: "top" },
  message: { color: colors.info, marginTop: 12, lineHeight: 19 },
  errorText: { color: colors.error, marginTop: 12, lineHeight: 19 },
  action: { minHeight: 52, backgroundColor: colors.brandPrimary, borderRadius: 26, alignItems: "center", justifyContent: "center", marginTop: 18 },
  actionText: { color: colors.onBrandPrimary, fontWeight: "700" },
  pressed: { opacity: 0.76 },
  disabled: { opacity: 0.6 },
  shareBlock: { marginTop: 22 },
  shareRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  shareChip: { minHeight: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.brandPrimary, justifyContent: "center" },
  shareChipDone: { backgroundColor: colors.brandTertiary, borderColor: colors.brandTertiary },
  shareChipText: { color: colors.brandPrimary, fontSize: 13, fontWeight: "700" },
  shareChipTextDone: { color: colors.onBrandTertiary },
  weekRow: { flexDirection: "row", justifyContent: "space-between" },
  day: { alignItems: "center", gap: 7 },
  dayDot: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  complete: { backgroundColor: colors.success, borderColor: colors.success },
  check: { color: colors.onSuccess, fontWeight: "800" },
  dayLabel: { color: colors.muted, fontSize: 12 },
});