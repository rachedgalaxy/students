
export type AttendanceStatus = 'present' | 'absent' | 'pe_kit' | 'justified';

export interface ClassSession {
  day: string;
  startTime: string;
  endTime: string;
}

export interface Class {
  id: string;
  name: string;
  schoolName: string;
  province?: string;
  teacherName: string;
  sessions: ClassSession[];
}

export interface Student {
  uid: string;
  id: string;
  name: string;
  classId: string;
  isArchived?: boolean; // خاصية جديدة لتحديد إذا كان التلميذ محذوفاً من القسم ولكن موجود في النظام
}

export interface AttendanceRecord {
  id: string;
  studentUid: string;
  studentId: string;
  classId: string;
  status: AttendanceStatus;
  date: string;
}

export type View = 'dashboard' | 'attendance' | 'students' | 'classes' | 'history' | 'reports' | 'settings' | 'schedule';

export interface FullBackup {
  students: Student[];
  classes: Class[];
  attendance: AttendanceRecord[];
  exportDate: string;
  version: string;
}

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'حاضر (ح)',
  pe_kit: 'بدون بدلة (أ)',
  justified: 'مبرر (ب)',
  absent: 'غياب (ج)',
};

export const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  pe_kit: 'bg-blue-100 text-blue-900 border-blue-200',
  justified: 'bg-amber-100 text-amber-900 border-amber-200',
  absent: 'bg-rose-100 text-rose-900 border-rose-200',
};

export const WEEK_DAYS = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت"
];

export const SECURITY_PIN = '0000';
