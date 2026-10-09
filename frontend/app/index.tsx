import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, AuthResponse, User } from "@/src/api";
import { AuthScreen } from "@/src/components/auth-screen";
import { storage } from "@/src/utils/storage";
import { colors } from "@/src/theme";
import { HomeScreen } from "@/src/components/home-screen";
import { Pulse60Screen } from "@/src/components/pulse60-screen";
import { CareScreen } from "@/src/components/care-screen";
import { MoreScreen } from "@/src/components/more-screen";

type Tab = "home" | "pulse" | "care" | "more";

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>("home");

  useEffect(() => {
    api.me().then(({ user: nextUser }) => setUser(nextUser)).catch(() => storage.secureRemove("pulse.auth.token")).finally(() => setChecking(false));
  }, []);

  const onAuthenticated = async (result: AuthResponse) => {
    await storage.secureSet("pulse.auth.token", result.token);
    setTab("home");
    setUser(result.user);
  };

  if (checking) return <View style={styles.loading}><ActivityIndicator color={colors.brandPrimary} /><Text style={styles.loadingText}>Checking your secure session…</Text></View>;
  if (!user) return <AuthScreen onAuthenticated={onAuthenticated} />;

  return <AppShell user={user} tab={tab} setTab={setTab} onLogout={async () => { await api.logout().catch(() => undefined); await storage.secureRemove("pulse.auth.token"); setTab("home"); setUser(null); }} />;
}

function AppShell({ user, tab, setTab, onLogout }: { user: User; tab: Tab; setTab: (tab: Tab) => void; onLogout: () => Promise<void> }) {
  const insets = useSafeAreaInsets();
  return <View style={styles.shell}><View style={styles.screen}>{tab === "home" ? <HomeScreen user={user} onNavigate={setTab} /> : null}{tab === "pulse" ? <Pulse60Screen /> : null}{tab === "care" ? <CareScreen /> : null}{tab === "more" ? <MoreScreen user={user} onLogout={onLogout} /> : null}</View><View style={[styles.nav, { paddingBottom: Math.max(insets.bottom, 10) }]}>{(["home", "pulse", "care", "more"] as const).map((item) => <Pressable testID={`nav-${item}`} key={item} onPress={() => setTab(item)} style={styles.navItem}><View style={[styles.navMark, tab === item && styles.navMarkActive]} /><Text style={[styles.navLabel, tab === item && styles.navActive]}>{item === "pulse" ? "Pulse 60" : item[0].toUpperCase() + item.slice(1)}</Text></Pressable>)}</View></View>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", gap: 14 },
  loadingText: { color: colors.muted, fontSize: 14 },
  shell: { flex: 1, backgroundColor: colors.surface },
  screen: { flex: 1 },
  nav: { flexDirection: "row", backgroundColor: colors.surfaceSecondary, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 8 },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 50, gap: 3 },
  navMark: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.muted, marginBottom: 6 },
  navMarkActive: { width: 22, borderRadius: 6, backgroundColor: colors.brandPrimary },
  navLabel: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  navActive: { color: colors.brandPrimary },
});
