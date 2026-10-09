import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, Appointment, Doctor } from "@/src/api";
import { colors } from "@/src/theme";

type CareFilters = { city?: string; speciality?: string; language?: string };

export function CareScreen() {
  const insets = useSafeAreaInsets();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filterOptions, setFilterOptions] = useState<{ cities: string[]; specialities: string[]; languages: string[] }>({ cities: [], specialities: [], languages: [] });
  const [filters, setFilters] = useState<CareFilters>({});
  const [filtering, setFiltering] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([api.doctors(), api.appointments()])
      .then(([doctorResult, appointmentResult]) => {
        setDoctors(doctorResult.doctors);
        setAppointments(appointmentResult.appointments);
        setFilterOptions({
          cities: [...new Set(doctorResult.doctors.map((doctor) => doctor.city))].sort(),
          specialities: [...new Set(doctorResult.doctors.map((doctor) => doctor.speciality))].sort(),
          languages: [...new Set(doctorResult.doctors.flatMap((doctor) => doctor.languages))].sort(),
        });
      })
      .catch(() => setMessage("We could not load care options right now."))
      .finally(() => setLoading(false));
  }, []);

  const toggleFilter = (key: keyof CareFilters, value: string) => {
    const next: CareFilters = { ...filters };
    if (next[key] === value) delete next[key];
    else next[key] = value;
    setFilters(next);
    setFiltering(true);
    setMessage("");
    api.doctors(next)
      .then((result) => setDoctors(result.doctors))
      .catch(() => setMessage("We could not apply that filter."))
      .finally(() => setFiltering(false));
  };

  const hasFilters = Boolean(filters.city || filters.speciality || filters.language);

  return (
    <ScrollView testID="care-screen" style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.eyebrow}>CARE DIRECTORY</Text>
      <Text style={styles.title}>Find the right conversation.</Text>
      <Text style={styles.subtitle}>Pulse only shows professionals stored and verified by your care directory. Booking requests remain pending until confirmed.</Text>
      {message ? <Text testID="care-error" style={styles.error}>{message}</Text> : null}
      {loading ? null : (
        <View testID="care-filters">
          <FilterRow label="City" options={filterOptions.cities} active={filters.city} onToggle={(value) => toggleFilter("city", value)} testIdPrefix="care-filter-city" />
          <FilterRow label="Speciality" options={filterOptions.specialities} active={filters.speciality} onToggle={(value) => toggleFilter("speciality", value)} testIdPrefix="care-filter-speciality" />
          <FilterRow label="Language" options={filterOptions.languages} active={filters.language} onToggle={(value) => toggleFilter("language", value)} testIdPrefix="care-filter-language" />
        </View>
      )}
      {loading || filtering ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : doctors.length ? (
        doctors.map((doctor) => <DoctorCard key={doctor.id} doctor={doctor} onBooked={(appointment) => setAppointments((current) => [appointment, ...current])} />)
      ) : (
        <View testID="care-empty-state" style={styles.empty}>
          <Text style={styles.emptyTitle}>{hasFilters ? "No matches for these filters" : "The directory is empty"}</Text>
          <Text style={styles.emptyCopy}>{hasFilters ? "Try removing a filter to see more professionals." : "No doctor records are available yet. We will not invent credentials, ratings, or availability."}</Text>
        </View>
      )}
      {appointments.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your requests</Text>
          {appointments.map((appointment) => <AppointmentRow key={appointment.id} appointment={appointment} onCancelled={(id) => setAppointments((current) => current.filter((item) => item.id !== id))} />)}
        </View>
      ) : null}
    </ScrollView>
  );
}

function FilterRow({ label, options, active, onToggle, testIdPrefix }: { label: string; options: string[]; active?: string; onToggle: (value: string) => void; testIdPrefix: string }) {
  if (!options.length) return null;
  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterLabel}>{label.toUpperCase()}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {options.map((option) => {
          const selected = active === option;
          return (
            <Pressable testID={`${testIdPrefix}-${option.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} key={option} onPress={() => onToggle(option)} style={[styles.chip, selected && styles.chipActive]}>
              <Text style={[styles.chipText, selected && styles.chipTextActive]}>{option}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function DoctorCard({ doctor, onBooked }: { doctor: Doctor; onBooked: (appointment: Appointment) => void }) {
  const [busy, setBusy] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const book = async () => {
    setBusy(true);
    setBookingError("");
    try {
      onBooked(await api.book({ doctor_id: doctor.id, requested_date: new Date(Date.now() + 86400000).toISOString(), consultation_mode: "video" }));
    } catch (requestError) {
      setBookingError(requestError instanceof Error ? requestError.message : "We could not send this request. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.doctor}>
      <View style={styles.doctorTop}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{doctor.name.slice(0, 1)}</Text></View>
        <View style={styles.doctorCopy}>
          <Text style={styles.doctorName}>{doctor.name}</Text>
          <Text style={styles.doctorMeta}>{doctor.designation} · {doctor.speciality}</Text>
          <Text style={styles.doctorMeta}>{doctor.city} · {doctor.languages.join(", ")}</Text>
        </View>
      </View>
      <Text style={styles.verified}>{doctor.verification_status}</Text>
      {bookingError ? <Text testID="care-booking-error" style={styles.error}>{bookingError}</Text> : null}
      <Pressable testID={`care-book-${doctor.id}`} disabled={busy} onPress={book} style={styles.book}>
        <Text style={styles.bookText}>{busy ? "Requesting…" : "Request appointment"}</Text>
      </Pressable>
    </View>
  );
}

function AppointmentRow({ appointment, onCancelled }: { appointment: Appointment; onCancelled: (id: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cancellable = appointment.status === "pending_confirmation" || appointment.status === "confirmed";
  const cancel = async () => {
    setBusy(true);
    setError("");
    try {
      await api.cancelAppointment(appointment.id);
      onCancelled(appointment.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We could not cancel this request.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.appointment}>
      <Text style={styles.appointmentName}>{appointment.doctor_name}</Text>
      <Text style={styles.appointmentDetail}>{appointment.requested_date} · {appointment.consultation_mode}</Text>
      <Text style={styles.pending}>{appointment.status.replace("_", " ")}</Text>
      {error ? <Text testID="care-cancel-error" style={styles.error}>{error}</Text> : null}
      {cancellable ? (
        <Pressable testID={`care-cancel-${appointment.id}`} disabled={busy} onPress={cancel} style={[styles.book, { backgroundColor: colors.surfaceSecondary }]}>
          <Text style={[styles.bookText, { color: colors.error }]}>{busy ? "Cancelling…" : "Cancel request"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.surface }, content: { paddingHorizontal: 22, paddingBottom: 32 }, eyebrow: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800", letterSpacing: 1.2 }, title: { color: colors.onSurface, fontSize: 30, fontWeight: "700", marginTop: 10 }, subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8 }, center: { minHeight: 200, justifyContent: "center", alignItems: "center" }, empty: { marginTop: 30, padding: 24, borderRadius: 16, backgroundColor: colors.surfaceTertiary }, emptyTitle: { color: colors.onSurface, fontSize: 19, fontWeight: "700" }, emptyCopy: { color: colors.muted, lineHeight: 21, marginTop: 8 }, doctor: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginTop: 16 }, doctorTop: { flexDirection: "row", gap: 12 }, avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" }, avatarText: { color: colors.onBrandTertiary, fontWeight: "800", fontSize: 19 }, doctorCopy: { flex: 1 }, doctorName: { color: colors.onSurface, fontSize: 16, fontWeight: "700" }, doctorMeta: { color: colors.muted, fontSize: 13, marginTop: 4 }, verified: { color: colors.success, fontSize: 12, fontWeight: "700", marginTop: 14 }, book: { minHeight: 44, borderRadius: 22, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", marginTop: 14 }, bookText: { color: colors.onBrandPrimary, fontWeight: "700" }, section: { marginTop: 28 }, sectionTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "700", marginBottom: 12 }, appointment: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.divider }, appointmentName: { color: colors.onSurface, fontWeight: "700" }, appointmentDetail: { color: colors.muted, marginTop: 4 }, pending: { color: colors.warning, fontSize: 12, fontWeight: "700", marginTop: 6, textTransform: "capitalize" }, error: { color: colors.error, marginTop: 16 }, filterGroup: { marginTop: 18 }, filterLabel: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1, marginBottom: 8 }, filterRow: { gap: 8, paddingRight: 22 }, chip: { minHeight: 36, flexShrink: 0, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, justifyContent: "center" }, chipActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary }, chipText: { color: colors.onSurfaceSecondary, fontSize: 13 }, chipTextActive: { color: colors.onBrandTertiary, fontWeight: "700" } });