export type Role = string;
export type EmploymentType = "FULL_TIME" | "INTERN";
export type AttendanceStatus = "WITHIN_RANGE" | "OUTSIDE_RANGE" | "NO_OFFICE_REFERENCE";
export type LeaveType = "CASUAL" | "SICK" | "PAID" | "UNPAID" | "OTHER";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";
export type HolidayType = "PUBLIC" | "OPTIONAL";

export interface LoginResult {
  id: string;
  name: string;
  role: Role;
  mustChangePassword: boolean;
  redirectTo: string;
}

export interface Me {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: Role;
  employmentType: EmploymentType;
  department: string | null;
  managerId: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  joinedOn: string;
  loginMethod?: string;
}

export interface OfficeRef {
  id: string;
  code: string;
  name: string;
}

export interface AttendancePunch {
  id: string;
  type: "CHECK_IN" | "CHECK_OUT";
  capturedAt: string;
  status: AttendanceStatus;
  distanceMeters: number | null;
  accuracyMeters: number | null;
  loginMethod: string;
  nearestOffice: OfficeRef | null;
}

export interface TodayState {
  checkIn: AttendancePunch | null;
  checkOut: AttendancePunch | null;
  durationMinutes: number | null;
  offices: Array<{
    id: string;
    code: string;
    name: string;
    latitude: number;
    longitude: number;
    attendanceRadiusMeters: number;
  }>;
}

export interface HistoryDay {
  date: string;
  checkIn: AttendancePunch | null;
  checkOut: AttendancePunch | null;
  durationMinutes: number | null;
}

export interface Leave {
  id: string;
  userId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  user?: {
    id: string;
    name: string;
    email: string | null;
    role: Role;
    department: string | null;
  };
  reviewedBy?: { id: string; name: string } | null;
  reviewNote?: string | null;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: Role;
  employmentType: EmploymentType;
  department: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  joinedOn: string;
  lastLoginAt: string | null;
  manager: { id: string; name: string } | null;
}

export interface Office {
  id: string;
  code: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  pincode: string | null;
  latitude: number;
  longitude: number;
  attendanceRadiusMeters: number;
  startTime: string;
  graceMinutes: number;
  isActive: boolean;
  _count?: { employees: number };
}

export interface RoleItem {
  id: string;
  name: string;
  createdAt: string;
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  type: HolidayType;
  description: string | null;
  officeId: string | null; // null = all offices
  office: { id: string; code: string; name: string } | null;
}

export interface DailySummary {
  date: string;
  totalEmployees: number;
  checkedIn: number;
  checkedOut: number;
  onLeave: number;
  onHoliday: number;
  /** Sum of minutes worked on holidays / weekends across all employees. */
  extraTimeMinutes: number;
  absent: number;
}

export interface DailyRow {
  userId: string;
  name: string;
  role: string;
  employmentType: string;
  department: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: string | null;
  distanceMeters: number | null;
  loginMethod: string | null;
  officeCode: string | null;
  durationMinutes: number | null;
  onLeave: boolean;
  isHoliday: boolean; // weekend OR explicit holiday for this user's office(s)
  isWeekend: boolean; // pure calendar Sat/Sun (subset of isHoliday)
  holidayName: string | null; // "Republic Day", "Saturday", "Sunday", …
  /** Minutes worked on a holiday / weekend, 0 otherwise. */
  extraTimeMinutes: number;
  latitude: number | null;
  longitude: number | null;
  office: { name: string; latitude: number; longitude: number; radiusMeters: number } | null;
}

export interface AttendanceDay {
  date: string;
  summary: DailySummary;
  rows: DailyRow[];
}

export interface GeocodeResult {
  label: string;
  latitude: number;
  longitude: number;
  city: string | null;
  state: string | null;
  pincode: string | null;
}
