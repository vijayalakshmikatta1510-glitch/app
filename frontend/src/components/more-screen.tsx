import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, Consent, User } from "@/src/api";
import { ReportsSection } from "@/src/components/reports-section";
import { colors } from "@/src/theme";

export function MoreScreen({ user, onLogout }: { user: User; onLogout: () => Promise<void> }) {
  const insets = useSafeAreaInsets();
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.consents()
      .then((consentResult) => setConsents(consentResult.consents))
      .catch(() => setMessage("We could not load your privacy settings."))
      .finally(() => setLoading(false));
  }, []);

  const consentValue = (type: string) => consents.find((item) => item.consent_type === type)?.granted ?? false;

  const toggleConsent = async (type: string, granted: boolean) => {
    setMessage("");
    try {
      const next = await api.updateConsent({ consent_type: type, granted });
      setConsents((current) => [...current.filter((item) => item.consent_type !== type), next]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update consent.");
    }
  };

  return (
    <ScrollView testID="more-screen" style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 30 }]} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>PROFILE & PRIVACY</Text>
      <Text style={styles.title}>{user.full_name}</Text>
      <Text style={styles.subtitle}>{user.email}</Text>
      {message ? <Text testID="more-message" style={styles.error}>{message}</Text> : null}
      {loading ? (
        <ActivityIndicator color={colors.brandPrimary} style={styles.loader} />
      ) : (
        <>
          <View style={styles.profileCard}>
            <ProfileRow label="Location" value={`${user.city}, ${user.state}`} />
            <ProfileRow label="Age" value={`${user.age}`} />
            <ProfileRow label="Phone" value={user.phone} />
          </View>
          <Text style={styles.sectionTitle}>Sharing consent</Text>
          <Text style={styles.sectionCopy}>Your health information stays private unless you explicitly grant access. Revoking consent removes future access.</Text>
          <SettingRow testID="consent-care-partner" title="Share with a care partner" detail="Allow a person you choose to view selected updates." value={consentValue("care_partner")} onChange={(value) => toggleConsent("care_partner", value)} />
          <SettingRow testID="consent-doctor" title="Share with a doctor" detail="Allow a professional to review selected health context." value={consentValue("doctor")} onChange={(value) => toggleConsent("doctor", value)} />
        </>
      )}
      {busy ? <ActivityIndicator color={colors.brandPrimary} style={styles.loader} /> : null}
      <ReportsSection />
      <Pressable testID="logout-button" onPress={async () => { setBusy(true); await onLogout(); }} style={styles.logout}>
        <Text style={styles.logoutText}>Log out securely</Text>
      </Pressable>
    </ScrollView>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) { return <View style={styles.profileRow}><Text style={styles.profileLabel}>{label}</Text><Text style={styles.profileValue}>{value}</Text></View>; }
function SettingRow({ testID, title, detail, value, onChange }: { testID: string; title: string; detail: string; value: boolean; onChange: (value: boolean) => void }) { return <View style={styles.setting}><View style={styles.settingCopy}><Text style={styles.settingTitle}>{title}</Text><Text style={styles.settingDetail}>{detail}</Text></View><Switch testID={testID} value={value} onValueChange={onChange} trackColor={{ false: colors.borderStrong, true: colors.brandPrimary }} thumbColor={colors.surfaceSecondary} /></View>; }

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.surface }, content: { paddingHorizontal: 22 }, eyebrow: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800", letterSpacing: 1.2 }, title: { color: colors.onSurface, fontSize: 30, fontWeight: "700", marginTop: 10 }, subtitle: { color: colors.muted, fontSize: 15, marginTop: 5 }, loader: { marginTop: 30 }, profileCard: { backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, marginTop: 26 }, profileRow: { minHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.divider, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, profileLabel: { color: colors.muted, fontSize: 13 }, profileValue: { color: colors.onSurface, fontWeight: "700" }, sectionTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "700", marginTop: 30, marginBottom: 8 }, sectionCopy: { color: colors.muted, lineHeight: 21, marginBottom: 12 }, setting: { minHeight: 72, borderBottomWidth: 1, borderBottomColor: colors.divider, flexDirection: "row", alignItems: "center", gap: 14 }, settingCopy: { flex: 1 }, settingTitle: { color: colors.onSurface, fontWeight: "700" }, settingDetail: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 3 }, empty: { backgroundColor: colors.surfaceTertiary, padding: 20, borderRadius: 14, marginTop: 8 }, error: { color: colors.error, marginTop: 16 }, logout: { minHeight: 50, borderRadius: 25, borderWidth: 1, borderColor: colors.error, alignItems: "center", justifyContent: "center", marginTop: 34, marginBottom: 12 }, logoutText: { color: colors.error, fontWeight: "700" } });