import { api, clearToken } from "./client";
import type {
  AdminUser,
  AttendanceDay,
  AttendancePunch,
  GeocodeResult,
  HistoryDay,
  Leave,
  LeaveType,
  LoginResult,
  Me,
  Office,
  RoleItem,
  TodayState,
} from "./types";

interface GeoPayload {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
}

export const auth = {
  login: (identifier: string, password: string) =>
    api.post<LoginResult>("/api/auth/login", { identifier, password }),
  logout: async () => {
    try {
      await api.post("/api/auth/logout", {});
    } finally {
      await clearToken();
    }
  },
  changePasswordRequest: () =>
    api.post<{ sent: boolean; emailMasked: string; devCode?: string }>(
      "/api/auth/password/change/request",
    ),
  changePasswordVerify: (code: string, newPassword: string) =>
    api.post<{ changed: true; redirectTo: string }>("/api/auth/password/change/verify", {
      code,
      newPassword,
    }),
  forgotRequest: (email: string) =>
    api.post<{ message: string; devCode?: string }>("/api/auth/password/forgot/request", {
      email,
    }),
  forgotVerify: (email: string, code: string, newPassword: string) =>
    api.post<{ reset: true }>("/api/auth/password/forgot/verify", { email, code, newPassword }),
};

export const me = {
  get: () => api.get<Me>("/api/me"),
  update: (id: string, patch: Partial<{ name: string; email: string; phone: string }>) =>
    api.patch<{ user: Me }>(`/api/users/${id}`, patch),
};

export const attendance = {
  today: () => api.get<TodayState>("/api/attendance/today"),
  history: () => api.get<{ days: HistoryDay[] }>("/api/attendance/history"),
  checkIn: (geo: GeoPayload) =>
    api.post<AttendancePunch>("/api/attendance/check-in", geo),
  checkOut: (geo: GeoPayload) =>
    api.post<AttendancePunch & { durationMinutes: number }>("/api/attendance/check-out", geo),
  adminDay: (date?: string) =>
    api.get<AttendanceDay>("/api/attendance", date ? { date } : undefined),
};

export const leave = {
  list: (params?: { status?: string; scope?: "all" }) =>
    api.get<{ leaves: Leave[] }>("/api/leave", params),
  apply: (input: { type: LeaveType; startDate: string; endDate: string; reason: string }) =>
    api.post<{ leave: Leave }>("/api/leave", input),
  review: (id: string, decision: "APPROVE" | "REJECT", reviewNote?: string) =>
    api.patch<{ leave: Leave }>(`/api/leave/${id}`, { decision, reviewNote }),
};

export const users = {
  list: (params?: { q?: string; role?: string }) =>
    api.get<{ users: AdminUser[] }>("/api/users", params),
  create: (input: Record<string, unknown>) =>
    api.post<{ user: AdminUser; emailSent: boolean; tempPassword?: string }>(
      "/api/users",
      input,
    ),
  update: (id: string, patch: Record<string, unknown>) =>
    api.patch<{ user: AdminUser }>(`/api/users/${id}`, patch),
  deactivate: (id: string) => api.del<{ deactivated: true }>(`/api/users/${id}`),
  resetPassword: (id: string) =>
    api.post<{ emailSent: boolean; tempPassword?: string }>(`/api/users/${id}/reset-password`),
};

export const offices = {
  list: () => api.get<{ offices: Office[] }>("/api/offices"),
  create: (input: Record<string, unknown>) =>
    api.post<{ office: Office }>("/api/offices", input),
  update: (id: string, patch: Record<string, unknown>) =>
    api.patch<{ office: Office }>(`/api/offices/${id}`, patch),
};

export const roles = {
  list: () => api.get<{ roles: RoleItem[] }>("/api/roles"),
  create: (name: string) => api.post<{ role: RoleItem }>("/api/roles", { name }),
};

export const geo = {
  search: (q: string) => api.get<{ results: GeocodeResult[] }>("/api/geocode", { q }),
  pincode: (pin: string) =>
    api.get<{
      pincode: string;
      district: string | null;
      state: string | null;
      city: string | null;
      latitude: number | null;
      longitude: number | null;
    }>(`/api/pincode/${pin}`),
};

export const reports = {
  dailyCsv: (date?: string) =>
    api.getRaw("/api/reports/daily.csv", date ? { date } : undefined),
  monthlyCsv: (month?: string) =>
    api.getRaw("/api/reports/monthly.csv", month ? { month } : undefined),
};
