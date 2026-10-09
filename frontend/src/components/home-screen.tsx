import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, Assessment, AssessmentQuestion, PulseSummary, TimelineEvent, User } from "@/src/api";
import { ScoreTrend } from "@/src/components/score-trend";
import { colors } from "@/src/theme";

export function HomeScreen({ user, onNavigate }: { user: User; onNavigate: (tab: "home" | "pulse" | "care" | "more") => void }) {
  const insets = useSafeAreaInsets();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [history, setHistory] = useState<Assessment[]>([]);
  const [pulse, setPulse] = useState<PulseSummary | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [showAssessment, setShowAssessment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { Promise.all([api.latestAssessment(), api.assessmentHistory(), api.pulse(), api.timeline()]).then(([assessmentResult, historyResult, pulseResult, timelineResult]) => { setAssessment(assessmentResult.assessment); setHistory(historyResult.assessments); setPulse(pulseResult); setTimeline(timelineResult.events.slice(0, 3)); }).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load your health metrics.")).finally(() => setLoading(false)); }, []);
  if (showAssessment) return <AssessmentPanel onDone={(nextAssessment) => { setAssessment(nextAssessment); setHistory((current) => [nextAssessment, ...current]); setShowAssessment(false); }} onBack={() => setShowAssessment(false)} />;
  return (
    <ScrollView testID="home-screen" style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.eyebrow}>YOUR PULSE</Text>
      <Text style={styles.greeting}>Good morning, {user.full_name.split(" ")[0]}.</Text>
      <Text style={styles.subtitle}>A small check-in can make patterns easier to notice.</Text>
      {error ? <Text testID="home-error" style={styles.error}>{error}</Text> : null}
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : (
        <>
          <View style={styles.scoreCard}>
            <View>
              <Text style={styles.cardEyebrow}>PULSE SCORE</Text>
              <Text style={styles.score}>{assessment ? assessment.total_score : "—"}<Text style={styles.scoreOutOf}> / 100</Text></Text>
              <Text style={styles.cardNote}>{assessment ? "Your latest awareness snapshot" : "Complete your first assessment"}</Text>
            </View>
            <View style={styles.scoreRing}><Text style={styles.ringText}>{assessment ? "READY" : "START"}</Text></View>
          </View>
          {history.length > 1 ? (
            <View style={styles.section} testID="home-score-trend">
              <Text style={styles.sectionTitle}>Your score trend</Text>
              <Text style={styles.trendNote}>Awareness snapshots over time — not a diagnosis.</Text>
              <ScoreTrend scores={history.slice(0, 10).reverse().map((item) => item.total_score)} />
            </View>
          ) : null}
          {assessment?.attention_flags?.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Worth keeping an eye on</Text>
              {assessment.attention_flags.map((flag) => (
                <View key={flag.label} style={styles.flag}>
                  <View style={styles.flagDot} />
                  <View style={styles.flagCopy}>
                    <Text style={styles.flagTitle}>{flag.label}</Text>
                    <Text style={styles.flagReason}>{flag.reason}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.actions}>
            <Pressable testID="home-assessment-button" onPress={() => setShowAssessment(true)} style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}>
              <Text style={styles.primaryActionText}>{assessment ? "Retake assessment" : "Start assessment"}</Text>
            </Pressable>
            <Pressable testID="home-pulse60-button" onPress={() => onNavigate("pulse")} style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}>
              <Text style={styles.secondaryActionText}>Do today’s Pulse 60</Text>
            </Pressable>
          </View>
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Your week</Text>
              <Pressable testID="home-view-all-button" onPress={() => onNavigate("pulse")}><Text style={styles.link}>View all</Text></Pressable>
            </View>
            <View style={styles.weekRow}>
              {(pulse?.days ?? []).map((day) => (
                <View key={day.date} style={styles.day}>
                  <View style={[styles.dayDot, day.complete && styles.dayDotComplete]}>
                    <Text style={[styles.dayCheck, day.complete && styles.dayCheckComplete]}>{day.complete ? "✓" : ""}</Text>
                  </View>
                  <Text style={styles.dayLabel}>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2)}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.streak}>{pulse?.streak ?? 0} day streak · {pulse?.total_checkins ?? 0} total check-ins</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent timeline</Text>
            {timeline.length ? timeline.map((event) => (
              <View key={event.id} style={styles.timelineItem}>
                <Text style={styles.timelineType}>{event.type.toUpperCase()}</Text>
                <Text style={styles.timelineTitle}>{event.title}</Text>
                <Text style={styles.timelineDetail}>{event.detail}</Text>
              </View>
            )) : <Text style={styles.empty}>Your saved check-ins, assessments, and reports will appear here.</Text>}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function AssessmentPanel({ onDone, onBack }: { onDone: (assessment: Assessment) => void; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.assessmentQuestions().then((result) => setQuestions(result.questions)).catch(() => setError("Failed to load assessment questions.")); }, []);
  const question = questions[index];
  const choose = (option: string) => setAnswers((current) => question.type === "multi" ? { ...current, [question.id]: (Array.isArray(current[question.id]) ? current[question.id] as string[] : []).includes(option) ? (current[question.id] as string[]).filter((item) => item !== option) : [...(Array.isArray(current[question.id]) ? current[question.id] as string[] : []), option] } : { ...current, [question.id]: option });
  const next = async () => { if (!question || !answers[question.id] || (Array.isArray(answers[question.id]) && !(answers[question.id] as string[]).length)) { setError("Choose an answer to continue."); return; } setError(""); if (index < questions.length - 1) { setIndex(index + 1); return; } setBusy(true); try { onDone(await api.submitAssessment({ answers, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" })); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Failed to save your assessment."); } finally { setBusy(false); } };
  return (
    <ScrollView testID="assessment-screen" style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}>
      <Pressable testID="assessment-back-button" onPress={onBack} style={styles.back}><Text style={styles.link}>‹ Back</Text></Pressable>
      <Text style={styles.eyebrow}>ASSESSMENT · {Math.min(index + 1, questions.length || 1)} / {questions.length || 10}</Text>
      <Text style={styles.assessmentTitle}>{question?.prompt ?? "Loading your questions…"}</Text>
      <Text style={styles.subtitle}>This is an awareness snapshot, not a diagnosis.</Text>
      <View style={styles.options}>
        {question?.options.map((option) => {
          const selected = question.type === "multi" ? (answers[question.id] as string[] | undefined)?.includes(option) : answers[question.id] === option;
          return (
            <Pressable testID={`assessment-option-${option.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} key={option} onPress={() => choose(option)} style={[styles.answer, selected && styles.answerSelected]}>
              <Text style={[styles.answerText, selected && styles.answerTextSelected]}>{option}</Text>
              {selected ? <Text style={styles.answerCheck}>✓</Text> : null}
            </Pressable>
          );
        })}
      </View>
      {error ? <Text testID="assessment-error" style={styles.error}>{error}</Text> : null}
      <Pressable testID="assessment-next-button" disabled={!question || busy} onPress={next} style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed, busy && styles.disabled]}>
        {busy ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.primaryActionText}>{index === questions.length - 1 ? "Save my awareness score" : "Continue"}</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.surface }, content: { paddingHorizontal: 22, paddingBottom: 30 }, eyebrow: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800", letterSpacing: 1.2 }, greeting: { color: colors.onSurface, fontSize: 30, fontWeight: "700", marginTop: 10 }, subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8 }, scoreCard: { marginTop: 26, padding: 22, backgroundColor: colors.brandPrimary, borderRadius: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, cardEyebrow: { color: colors.brandTertiary, fontSize: 11, fontWeight: "800", letterSpacing: 1 }, score: { color: colors.onBrandPrimary, fontSize: 54, fontWeight: "800", marginTop: 4 }, scoreOutOf: { fontSize: 17, fontWeight: "500" }, cardNote: { color: colors.brandTertiary, fontSize: 13, marginTop: 4 }, scoreRing: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" }, ringText: { color: colors.onBrandPrimary, fontSize: 10, fontWeight: "800", letterSpacing: 1 }, section: { marginTop: 30 }, sectionTitle: { color: colors.onSurface, fontSize: 19, fontWeight: "700" }, flag: { flexDirection: "row", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.divider }, flagDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.warning, marginTop: 5 }, flagCopy: { flex: 1 }, flagTitle: { color: colors.onSurface, fontWeight: "700" }, flagReason: { color: colors.muted, marginTop: 4, lineHeight: 19 }, actions: { gap: 10, marginTop: 26 }, primaryAction: { minHeight: 52, borderRadius: 26, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 }, primaryActionText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "700" }, secondaryAction: { minHeight: 52, borderRadius: 26, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 }, secondaryActionText: { color: colors.onBrandTertiary, fontSize: 15, fontWeight: "700" }, pressed: { opacity: 0.76 }, disabled: { opacity: 0.6 }, rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, link: { color: colors.brandPrimary, fontWeight: "700" }, weekRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 }, day: { alignItems: "center", gap: 7 }, dayDot: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" }, dayDotComplete: { backgroundColor: colors.success, borderColor: colors.success }, dayCheck: { color: colors.muted }, dayCheckComplete: { color: colors.onSuccess, fontWeight: "800" }, dayLabel: { color: colors.muted, fontSize: 12 }, streak: { color: colors.onSurfaceSecondary, fontSize: 13, marginTop: 15 }, timelineItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.divider }, timelineType: { color: colors.brandPrimary, fontSize: 10, fontWeight: "800", letterSpacing: 1 }, timelineTitle: { color: colors.onSurface, fontWeight: "700", marginTop: 5 }, timelineDetail: { color: colors.muted, marginTop: 3 }, empty: { color: colors.muted, lineHeight: 21, marginTop: 10 }, trendNote: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6 }, center: { minHeight: 180, alignItems: "center", justifyContent: "center" }, error: { color: colors.error, lineHeight: 20, marginTop: 14 }, back: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }, assessmentTitle: { color: colors.onSurface, fontSize: 28, lineHeight: 35, fontWeight: "700", marginTop: 28 }, options: { gap: 10, marginTop: 28, marginBottom: 18 }, answer: { minHeight: 54, borderWidth: 1, borderColor: colors.border, borderRadius: 13, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surfaceSecondary }, answerSelected: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary }, answerText: { color: colors.onSurfaceSecondary, fontSize: 15 }, answerTextSelected: { color: colors.onBrandTertiary, fontWeight: "700" }, answerCheck: { color: colors.brandPrimary, fontWeight: "800" },
});