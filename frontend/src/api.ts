import Constants from "expo-constants";

import { storage } from "@/src/utils/storage";

export const TOKEN_KEY = "pulse.auth.token";
const configuredUrl = Constants.expoConfig?.extra?.backendUrl as string | undefined;
const backendUrl = configuredUrl ?? process.env.EXPO_PUBLIC_BACKEND_URL ?? "";
export const API_BASE = `${backendUrl.replace(/\/$/, "")}/api`;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await storage.secureGet<string | null>(TOKEN_KEY, null);
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const raw = await response.text();
  let data: { detail?: string } & T;
  try {
    data = raw ? JSON.parse(raw) : ({} as T);
  } catch {
    data = {} as T;
  }
  if (!response.ok) throw new ApiError(response.status, data.detail ?? "Something went wrong. Please try again.");
  return data as T;
}

export type User = {
  id: string;
  full_name: string;
  age: number;
  gender: string;
  state: string;
  city: string;
  phone: string;
  email?: string | null;
  email_verified: boolean;
  circle_handle?: string | null;
  circle_share?: boolean;
  created_at: string;
};

export type AuthResponse = { token: string; user: User };

export const api = {
  register: (body: Record<string, unknown>) => request<{ user_id: string; message: string; dev_otp?: string }>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  verifyOtp: (body: { user_id: string; otp: string }) => request<AuthResponse>("/auth/verify-otp", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) => request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  requestReset: (body: { email: string }) => request<{ message: string; dev_reset_code?: string }>("/auth/request-reset", { method: "POST", body: JSON.stringify(body) }),
  resetPassword: (body: { email: string; reset_code: string; new_password: string }) => request<{ message: string }>("/auth/reset-password", { method: "POST", body: JSON.stringify(body) }),
  me: () => request<{ user: User }>("/auth/me"),
  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),
  assessmentQuestions: () => request<{ version: string; disclaimer: string; questions: AssessmentQuestion[] }>("/assessment/questions"),
  latestAssessment: () => request<{ assessment: Assessment | null }>("/assessment/latest"),
  submitAssessment: (body: { answers: Record<string, unknown>; timezone: string }) => request<Assessment>("/assessment", { method: "POST", body: JSON.stringify(body) }),
  pulse: () => request<PulseSummary>("/pulse60"),
  savePulse: (body: Record<string, unknown>) => request<{ summary: PulseSummary }>("/pulse60", { method: "POST", body: JSON.stringify(body) }),
  uploads: () => request<{ uploads: UploadRecord[] }>("/uploads"),
  uploadReport: (form: FormData) => request<UploadRecord>("/uploads", { method: "POST", body: form }),
  deleteUpload: (id: string) => request<{ message: string }>(`/uploads/${id}`, { method: "DELETE" }),
  timeline: () => request<{ events: TimelineEvent[] }>("/timeline"),
  doctors: (filters?: { city?: string; speciality?: string; language?: string }) => {
    const params = new URLSearchParams();
    if (filters?.city) params.set("city", filters.city);
    if (filters?.speciality) params.set("speciality", filters.speciality);
    if (filters?.language) params.set("language", filters.language);
    const query = params.toString();
    return request<{ doctors: Doctor[] }>(`/doctors${query ? `?${query}` : ""}`);
  },
  appointments: () => request<{ appointments: Appointment[] }>("/appointments"),
  book: (body: Record<string, unknown>) => request<Appointment>("/appointments", { method: "POST", body: JSON.stringify(body) }),
  cancelAppointment: (id: string) => request<{ message: string }>(`/appointments/${id}`, { method: "DELETE" }),
  groups: () => request<{ groups: CommunityGroup[] }>("/community/groups"),
  joinGroup: (id: string) => request<{ message: string }>(`/community/groups/${id}/join`, { method: "POST" }),
  leaveGroup: (id: string) => request<{ message: string }>(`/community/groups/${id}/join`, { method: "DELETE" }),
  posts: (groupId: string) => request<{ posts: CommunityPost[] }>(`/community/posts?group_id=${encodeURIComponent(groupId)}`),
  createPost: (body: { group_id: string; body: string }) => request<CommunityPost>("/community/posts", { method: "POST", body: JSON.stringify(body) }),
  reportPost: (id: string, reason = "member_flag") => request<{ message: string }>(`/community/posts/${id}/report`, { method: "POST", body: JSON.stringify({ reason }) }),
  blockPostAuthor: (id: string) => request<{ message: string }>(`/community/posts/${id}/block`, { method: "POST", body: JSON.stringify({}) }),
  groupStats: (id: string) => request<GroupStats>(`/community/groups/${id}/stats`),
  assessmentHistory: () => request<{ assessments: Assessment[] }>("/assessment/history"),
  benefits: () => request<Benefits>("/pulse60/benefits"),
  claimBenefits: () => request<{ message: string; claimed: boolean }>("/pulse60/benefits/claim", { method: "POST", body: JSON.stringify({}) }),
  subscription: () => request<Subscription>("/subscription"),
  choosePlan: (body: { plan: string }) => request<{ message: string }>("/subscription/choose", { method: "POST", body: JSON.stringify(body) }),
  nearYou: () => request<NearYou>("/community/near-you"),
  updateSharing: (share: boolean) => request<{ share: boolean; handle: string; message: string }>("/community/sharing", { method: "PUT", body: JSON.stringify({ share }) }),
  followingPosts: () => request<{ posts: CommunityPost[] }>("/community/posts?scope=following"),
  family: () => request<FamilyData>("/family"),
  createFamily: (body: { name: string }) => request<{ message: string }>("/family", { method: "POST", body: JSON.stringify(body) }),
  inviteFamily: (body: { email: string }) => request<{ message: string }>("/family/invite", { method: "POST", body: JSON.stringify(body) }),
  acceptFamilyInvite: (id: string) => request<{ message: string }>(`/family/invites/${id}/accept`, { method: "POST", body: JSON.stringify({}) }),
  declineFamilyInvite: (id: string) => request<{ message: string }>(`/family/invites/${id}/decline`, { method: "POST", body: JSON.stringify({}) }),
  leaveFamily: () => request<{ message: string }>("/family/leave", { method: "POST", body: JSON.stringify({}) }),
  removeFamilyMember: (userId: string) => request<{ message: string }>(`/family/members/${userId}`, { method: "DELETE" }),
  nudgeMember: (userId: string) => request<{ message: string }>("/family/nudge", { method: "POST", body: JSON.stringify({ member_user_id: userId }) }),
  groupChallenge: (groupId: string) => request<{ challenge: Challenge | null }>(`/community/groups/${groupId}/challenge`),
  consents: () => request<{ consents: Consent[] }>("/consents"),
  updateConsent: (body: Record<string, unknown>) => request<Consent>("/consents", { method: "PUT", body: JSON.stringify(body) }),
};

export type AssessmentQuestion = { id: string; prompt: string; type: "single" | "multi"; options: string[] };
export type Assessment = { id: string; total_score: number; answers: Record<string, unknown>; attention_flags: { label: string; reason: string }[]; created_at: string };
export type PulseSummary = { streak: number; days: { date: string; complete: boolean }[]; today?: { movement: string; nourishment: string; wellbeing: string } | null; total_checkins: number };
export type TimelineEvent = { id: string; type: string; title: string; detail: string; created_at: string };
export type Doctor = { id: string; name: string; designation: string; speciality: string; city: string; languages: string[]; verification_status: string; availability_status: string };
export type Appointment = { id: string; doctor_name: string; requested_date: string; consultation_mode: string; status: string };
export type CommunityGroup = { id: string; name: string; topic: string; city?: string; joined: boolean; member_count?: number };
export type Consent = { consent_type: string; granted: boolean; updated_at: string };
export type CommunityPost = { id: string; group_id: string; author_name: string; body: string; created_at: string };
export type GroupStats = { members: number; checkins_this_week: number; weekly_goal: number; posts: number };
export type Benefits = { streak: number; target: number; unlocked: boolean; claimed: boolean; benefits: string[]; fulfilment: string };
export type SubscriptionPlan = { id: string; name: string; price_inr: number; period: string; features: string[] };
export type Subscription = { plan: string; trial_active: boolean; trial_ends_at: string; trial_days_left: number; payment_status: string | null; plans: SubscriptionPlan[] };
export type NearYou = { completed_today: number; streak: number; city: string };
export type FamilyMember = { user_id: string; name: string; role: string; is_self?: boolean; streak: number; checkins_this_week: number; latest_score: number | null; joined_at: string };
export type FamilyInvite = { id: string; email?: string; status?: string; family_name?: string; from_name?: string };
export type FamilyData = { family: { id: string; name: string; created_by: string } | null; members: FamilyMember[]; invites_sent: FamilyInvite[]; invites_received: FamilyInvite[]; is_admin: boolean; nudges: { id: string; from_name: string; created_at: string }[] };
export type Challenge = { id: string; group_id: string; title: string; metric: string; target: number; start_date: string; end_date: string; my_progress: number; group_progress: number; participants: number };
export type UploadRecord = { id: string; purpose: string; confirmed_date?: string | null; original_name: string; content_type: string; size: number; validation_status: string; created_at: string };