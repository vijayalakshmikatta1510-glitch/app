import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";

import { API_BASE, api, TOKEN_KEY, UploadRecord } from "@/src/api";
import { storage } from "@/src/utils/storage";
import { colors } from "@/src/theme";

const MAX_BYTES = 10 * 1024 * 1024;

export function ReportsSection() {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [viewingId, setViewingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [photoExplain, setPhotoExplain] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    api.uploads().then((result) => setUploads(result.uploads)).catch(() => setError("We could not load your reports.")).finally(() => setLoading(false));
  }, []);

  const send = async (asset: { uri: string; name: string; mimeType: string; size?: number }) => {
    setError("");
    setMessage("");
    if (asset.size && asset.size > MAX_BYTES) {
      setError("That file is larger than 10 MB.");
      return;
    }
    const form = new FormData();
    if (Platform.OS === "web") {
      const blob = await (await fetch(asset.uri)).blob();
      form.append("file", blob, asset.name);
    } else {
      form.append("file", { uri: asset.uri, name: asset.name, type: asset.mimeType } as unknown as Blob);
    }
    form.append("purpose", "health_report");
    setBusy(true);
    try {
      const record = await api.uploadReport(form);
      setUploads((current) => [record, ...current]);
      setMessage("Report uploaded privately. Only you can access it.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We could not upload this file.");
    } finally {
      setBusy(false);
    }
  };

  const viewItem = async (item: UploadRecord) => {
    setError("");
    setMessage("");
    setViewingId(item.id);
    try {
      const token = await storage.secureGet<string | null>(TOKEN_KEY, null);
      const url = `${API_BASE}/uploads/${item.id}/download`;
      if (Platform.OS === "web") {
        const response = await fetch(url, { headers: { Authorization: `Bearer ${token ?? ""}` } });
        if (!response.ok) throw new Error("We could not open this file. Please try again.");
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = item.original_name;
        anchor.rel = "noopener";
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
        setMessage("Download started.");
      } else {
        const safeName = item.original_name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const target = `${FileSystem.cacheDirectory}${item.id}-${safeName}`;
        const result = await FileSystem.downloadAsync(url, target, { headers: { Authorization: `Bearer ${token ?? ""}` } });
        if (result.status !== 200) throw new Error("We could not open this file. Please try again.");
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.uri, { mimeType: item.content_type, dialogTitle: item.original_name });
        } else {
          setMessage("File downloaded to your device.");
        }
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We could not open this file.");
    } finally {
      setViewingId("");
    }
  };

  const launchPhotoPicker = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    await send({ uri: asset.uri, name: asset.fileName ?? "photo.jpg", mimeType: asset.mimeType ?? "image/jpeg", size: asset.fileSize });
  };

  const pickPhoto = async () => {
    setError("");
    setMessage("");
    if (Platform.OS === "web") {
      await launchPhotoPicker();
      return;
    }
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (current.granted) {
      await launchPhotoPicker();
      return;
    }
    if (!current.canAskAgain) {
      setShowSettings(true);
      setError("Photo access is turned off. Enable it in Settings to attach photo reports.");
      return;
    }
    setPhotoExplain(true);
  };

  const confirmPhotoPermission = async () => {
    setPhotoExplain(false);
    const response = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (response.granted) {
      await launchPhotoPicker();
      return;
    }
    if (!response.canAskAgain) setShowSettings(true);
    setError("Without photo access you can still add reports as documents.");
  };

  const pickDocument = async () => {
    setError("");
    setMessage("");
    const result = await DocumentPicker.getDocumentAsync({ type: ["image/jpeg", "image/png", "application/pdf"], copyToCacheDirectory: true });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    await send({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? "application/pdf", size: asset.size });
  };

  const remove = async (id: string) => {
    setError("");
    setMessage("");
    try {
      await api.deleteUpload(id);
      setUploads((current) => current.filter((item) => item.id !== id));
      setMessage("Report deleted.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We could not delete this file.");
    }
  };

  return (
    <View testID="reports-section">
      <Text style={styles.sectionTitle}>Health reports</Text>
      <Text style={styles.sectionCopy}>Add lab reports or prescriptions (JPEG, PNG or PDF, up to 10 MB). Files are stored privately — tap a report to view or save it.</Text>
      <View style={styles.actions}>
        <Pressable testID="reports-add-photo" disabled={busy} onPress={pickPhoto} style={({ pressed }) => [styles.action, pressed && styles.pressed, busy && styles.disabled]}>
          <Text style={styles.actionText}>Add photo</Text>
        </Pressable>
        <Pressable testID="reports-add-document" disabled={busy} onPress={pickDocument} style={({ pressed }) => [styles.action, styles.actionSecondary, pressed && styles.pressed, busy && styles.disabled]}>
          <Text style={[styles.actionText, styles.actionSecondaryText]}>Add document</Text>
        </Pressable>
      </View>
      {photoExplain ? (
        <View testID="reports-photo-explain" style={styles.explain}>
          <Text style={styles.explainText}>Pulse needs photo access only to attach the report photos you choose. Nothing is uploaded without you picking it.</Text>
          <Pressable testID="reports-photo-continue" onPress={confirmPhotoPermission} style={styles.explainButton}>
            <Text style={styles.explainButtonText}>Continue</Text>
          </Pressable>
        </View>
      ) : null}
      {busy ? <ActivityIndicator color={colors.brandPrimary} style={styles.loader} /> : null}
      {showSettings ? (
        <Pressable testID="reports-open-settings" onPress={() => Linking.openSettings()} style={styles.settingsButton}>
          <Text style={styles.settingsText}>Open Settings</Text>
        </Pressable>
      ) : null}
      {error ? <Text testID="reports-error" style={styles.error}>{error}</Text> : null}
      {message ? <Text testID="reports-message" style={styles.message}>{message}</Text> : null}
      {loading ? (
        <ActivityIndicator color={colors.brandPrimary} style={styles.loader} />
      ) : uploads.length ? (
        uploads.map((item) => (
          <View key={item.id} style={styles.row}>
            <Pressable testID={`reports-view-${item.id}`} disabled={viewingId === item.id} onPress={() => viewItem(item)} style={({ pressed }) => [styles.rowCopy, pressed && styles.pressed]}>
              <Text style={styles.rowName} numberOfLines={1}>{item.original_name}</Text>
              <Text style={styles.rowMeta}>{item.content_type === "application/pdf" ? "PDF" : "Image"} · {Math.max(1, Math.round(item.size / 1024))} KB · {item.validation_status} · Tap to view</Text>
            </Pressable>
            {viewingId === item.id ? (
              <ActivityIndicator color={colors.brandPrimary} />
            ) : (
              <Pressable testID={`reports-delete-${item.id}`} onPress={() => remove(item.id)} style={styles.delete}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            )}
          </View>
        ))
      ) : (
        <Text testID="reports-empty" style={styles.empty}>No reports yet. Files you add appear here and in your timeline.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "700", marginTop: 30, marginBottom: 8 },
  sectionCopy: { color: colors.muted, lineHeight: 21, marginBottom: 12 },
  actions: { flexDirection: "row", gap: 10 },
  action: { flex: 1, minHeight: 46, borderRadius: 23, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  actionSecondary: { backgroundColor: colors.brandTertiary },
  actionText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: 14 },
  actionSecondaryText: { color: colors.onBrandTertiary },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.6 },
  explain: { backgroundColor: colors.surfaceTertiary, borderRadius: 14, padding: 16, marginTop: 14 },
  explainText: { color: colors.onSurfaceSecondary, lineHeight: 20 },
  explainButton: { minHeight: 42, borderRadius: 21, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", marginTop: 12 },
  explainButtonText: { color: colors.onBrandPrimary, fontWeight: "700" },
  settingsButton: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", marginTop: 14 },
  settingsText: { color: colors.brandPrimary, fontWeight: "700" },
  loader: { marginTop: 16 },
  error: { color: colors.error, marginTop: 14, lineHeight: 20 },
  message: { color: colors.info, marginTop: 14, lineHeight: 20 },
  row: { minHeight: 58, borderBottomWidth: 1, borderBottomColor: colors.divider, flexDirection: "row", alignItems: "center", gap: 12 },
  rowCopy: { flex: 1, minHeight: 48, justifyContent: "center" },
  rowName: { color: colors.onSurface, fontWeight: "700" },
  rowMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  delete: { minHeight: 40, minWidth: 68, borderRadius: 20, borderWidth: 1, borderColor: colors.error, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  deleteText: { color: colors.error, fontWeight: "700", fontSize: 13 },
  empty: { color: colors.muted, lineHeight: 21, marginTop: 14 },
});
