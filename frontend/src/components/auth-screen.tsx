import { useState } from "react";
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, AuthResponse } from "@/src/api";
import { colors } from "@/src/theme";

export function AuthScreen({ onAuthenticated }: { onAuthenticated: (result: AuthResponse) => Promise<void> }) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"register" | "login">("register");
  const [step, setStep] = useState<"form" | "otp" | "reset">("form");
  const [form, setForm] = useState({ full_name: "", age: "", gender: "Female", state: "", city: "", phone: "", email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [pendingUserId, setPendingUserId] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [devResetCode, setDevResetCode] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    Keyboard.dismiss();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await onAuthenticated(await api.login({ email: form.email, password: form.password }));
      } else {
        const result = await api.register({ ...form, age: Number(form.age) });
        setPendingUserId(result.user_id);
        setDevOtp(result.dev_otp ?? "");
        setStep("otp");
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We could not complete that request.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setError("");
    setBusy(true);
    try {
      await onAuthenticated(await api.verifyOtp({ user_id: pendingUserId, otp }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "That code could not be verified.");
    } finally {
      setBusy(false);
    }
  };

  const requestReset = async () => {
    Keyboard.dismiss();
    setError("");
    setBusy(true);
    try {
      const result = await api.requestReset({ email: form.email });
      setDevResetCode(result.dev_reset_code ?? "");
      setResetSent(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We could not start recovery.");
    } finally {
      setBusy(false);
    }
  };

  const confirmReset = async () => {
    Keyboard.dismiss();
    setError("");
    setResetMessage("");
    setBusy(true);
    try {
      await api.resetPassword({ email: form.email, reset_code: resetCode, new_password: newPassword });
      setResetMessage("Your password has been updated. You can log in with it now.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We could not update your password.");
    } finally {
      setBusy(false);
    }
  };

  const field = (label: string, key: keyof typeof form, placeholder: string, keyboardType?: "default" | "email-address" | "number-pad" | "phone-pad", secureTextEntry = false) => (
    <View style={styles.field} key={key}>
      <Text style={styles.label}>{label}</Text>
      <TextInput testID={`auth-input-${key}`} value={form[key]} onChangeText={(value) => update(key, value)} placeholder={placeholder} placeholderTextColor={colors.muted} style={styles.input} keyboardType={keyboardType} secureTextEntry={secureTextEntry} autoCapitalize={key === "email" ? "none" : "sentences"} />
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled">
        <Text style={styles.wordmark}>pulse</Text>
        <Text style={styles.title}>{step === "otp" ? "Verify your email to continue." : step === "reset" ? "Recover your account." : mode === "register" ? "Take control of your health with Pulse." : "Welcome back to Pulse."}</Text>
        <Text style={styles.subtitle}>{step === "otp" ? "Enter the six-digit development code sent to your email." : step === "reset" ? "We verify it is you before the password changes." : "Build your personal health profile and stay aware of what matters most."}</Text>
        {step === "reset" ? (
          <View style={styles.formBlock}>
            {resetSent ? (
              <>
                {devResetCode ? <Text testID="auth-dev-reset-code" style={styles.devCode}>Development recovery code: {devResetCode}</Text> : null}
                <View style={styles.field}>
                  <Text style={styles.label}>Recovery code</Text>
                  <TextInput testID="auth-input-reset-code" value={resetCode} onChangeText={setResetCode} placeholder="6 digits" placeholderTextColor={colors.muted} style={styles.input} keyboardType="number-pad" maxLength={6} />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>New password</Text>
                  <TextInput testID="auth-input-new-password" value={newPassword} onChangeText={setNewPassword} placeholder="At least 8 characters" placeholderTextColor={colors.muted} style={styles.input} secureTextEntry />
                </View>
                {error ? <Text testID="auth-error" style={styles.error}>{error}</Text> : null}
                {resetMessage ? <Text testID="auth-reset-success" style={[styles.error, { color: colors.success }]}>{resetMessage}</Text> : null}
                <ActionButton testID="auth-reset-confirm" title="Set new password" onPress={confirmReset} busy={busy} />
              </>
            ) : (
              <>
                {field("Email address", "email", "you@example.com", "email-address")}
                {error ? <Text testID="auth-error" style={styles.error}>{error}</Text> : null}
                <ActionButton testID="auth-reset-request" title="Send recovery code" onPress={requestReset} busy={busy} />
              </>
            )}
            <Pressable testID="auth-reset-back" onPress={() => { setStep("form"); setError(""); setResetSent(false); setResetMessage(""); setResetCode(""); setNewPassword(""); }} style={styles.textButton}><Text style={styles.textButtonLabel}>Back to log in</Text></Pressable>
          </View>
        ) : step === "otp" ? (
          <View style={styles.formBlock}>
            {devOtp ? <Text testID="auth-dev-otp" style={styles.devCode}>Development verification code: {devOtp}</Text> : null}
            <Text style={styles.label}>Verification code</Text>
            <TextInput testID="auth-input-otp" value={otp} onChangeText={setOtp} placeholder="6 digits" placeholderTextColor={colors.muted} style={styles.input} keyboardType="number-pad" maxLength={6} />
            <ActionButton testID="auth-verify" title="Verify and enter Pulse" onPress={verify} busy={busy} />
            <Pressable onPress={() => setStep("form")} style={styles.textButton}><Text style={styles.textButtonLabel}>Back to registration</Text></Pressable>
          </View>
        ) : (
          <View style={styles.formBlock}>
            <View style={styles.modeSwitch}>
              {(["register", "login"] as const).map((item) => <Pressable testID={`auth-mode-${item}`} key={item} onPress={() => { setMode(item); setError(""); }} style={[styles.modeButton, mode === item && styles.modeButtonActive]}><Text style={[styles.modeText, mode === item && styles.modeTextActive]}>{item === "register" ? "Create account" : "Log in"}</Text></Pressable>)}
            </View>
            {mode === "register" ? <>{field("Full name", "full_name", "Your name")}{field("Age", "age", "Your age", "number-pad")}<Text style={styles.label}>Gender</Text><View style={styles.optionRow}>{["Female", "Male", "Non-binary", "Prefer not to say"].map((item) => <Pressable testID={`auth-gender-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} key={item} onPress={() => update("gender", item)} style={[styles.option, form.gender === item && styles.optionActive]}><Text style={[styles.optionText, form.gender === item && styles.optionTextActive]}>{item}</Text></Pressable>)}</View>{field("State", "state", "Your state")}{field("City", "city", "Your city")}{field("Phone number", "phone", "Your phone number", "phone-pad")}</> : null}
            {field("Email address", "email", "you@example.com", "email-address")}
            {field("Password", "password", "At least 8 characters", "default", true)}
            {error ? <Text testID="auth-error" style={styles.error}>{error}</Text> : null}
            <ActionButton testID="auth-submit" title={mode === "register" ? "Register" : "Log in"} onPress={submit} busy={busy} />
            {mode === "login" ? <Pressable testID="auth-forgot-link" onPress={() => { setStep("reset"); setError(""); }} style={styles.textButton}><Text style={styles.textButtonLabel}>Forgot password?</Text></Pressable> : null}
            <Text style={styles.privacy}>Your health information is private and protected.</Text>
            <Text style={styles.disclaimer}>Pulse supports health awareness and conversation. It does not diagnose or prescribe treatment.</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ActionButton({ testID, title, onPress, busy }: { testID: string; title: string; onPress: () => void; busy: boolean }) {
  return <Pressable testID={testID} accessibilityRole="button" disabled={busy} onPress={onPress} style={({ pressed }) => [styles.action, pressed && styles.pressed, busy && styles.disabled]}>{busy ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.actionLabel}>{title}</Text>}</Pressable>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 24 },
  wordmark: { color: colors.brandPrimary, fontSize: 34, fontWeight: "800", letterSpacing: -1 },
  title: { color: colors.onSurface, fontSize: 28, lineHeight: 34, fontWeight: "700", marginTop: 24, maxWidth: 360 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: 12, maxWidth: 360 },
  formBlock: { marginTop: 28 },
  modeSwitch: { flexDirection: "row", backgroundColor: colors.surfaceTertiary, borderRadius: 20, padding: 4, marginBottom: 24 },
  modeButton: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 16 },
  modeButtonActive: { backgroundColor: colors.surfaceSecondary },
  modeText: { color: colors.muted, fontWeight: "600" },
  modeTextActive: { color: colors.brandPrimary },
  field: { marginBottom: 16 },
  label: { color: colors.onSurface, fontSize: 13, fontWeight: "700", marginBottom: 8 },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surfaceSecondary, color: colors.onSurface, paddingHorizontal: 15, fontSize: 16 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  option: { minHeight: 44, paddingHorizontal: 13, justifyContent: "center", borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
  optionActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary },
  optionText: { color: colors.onSurfaceSecondary, fontSize: 13 },
  optionTextActive: { color: colors.onBrandTertiary, fontWeight: "700" },
  action: { minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: 26, backgroundColor: colors.brandPrimary, marginTop: 8 },
  actionLabel: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "700" },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.6 },
  error: { color: colors.error, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  privacy: { color: colors.onSurfaceSecondary, textAlign: "center", marginTop: 18, fontSize: 13 },
  disclaimer: { color: colors.muted, textAlign: "center", marginTop: 18, fontSize: 12, lineHeight: 18 },
  devCode: { color: colors.info, backgroundColor: colors.brandTertiary, borderRadius: 10, padding: 12, marginBottom: 18, textAlign: "center", fontWeight: "700" },
  textButton: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 8 },
  textButtonLabel: { color: colors.brandPrimary, fontWeight: "700" },
});