
import { Student, Class, AttendanceRecord, FullBackup } from '../types';

const KEYS = {
  STUDENTS: 'ams_v3_students',
  CLASSES: 'ams_v3_classes',
  ATTENDANCE: 'ams_v3_attendance',
  INITIALIZED: 'ams_v3_initialized',
  LAST_IMPORT: 'ams_v3_last_import',
};

// توليد معرف فريد بسيط
const generateUid = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

export const storage = {
  getStudents: (): Student[] => {
    try {
      const data = localStorage.getItem(KEYS.STUDENTS);
      const students: any[] = data ? JSON.parse(data) : [];
      
      // ترقية البيانات القديمة التي لا تحتوي على uid
      let needsUpdate = false;
      const upgraded = students.map(s => {
        if (!s.uid) {
          needsUpdate = true;
          return { ...s, uid: s.id || generateUid() };
        }
        return s;
      });

      if (needsUpdate) {
        storage.saveStudents(upgraded);
      }
      return upgraded;
    } catch (e) { return []; }
  },
  
  saveStudents: (students: Student[]) => {
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
  },
  
  getClasses: (): Class[] => {
    try {
      const data = localStorage.getItem(KEYS.CLASSES);
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.map((c: any) => {
          if (!c.sessions) {
            return { ...c, sessions: [] };
          }
          return c;
        });
      }
      
      const isInitialized = localStorage.getItem(KEYS.INITIALIZED);
      if (isInitialized === 'true') return [];
    } catch (e) {}
    
    return [
      { 
        id: 'c1', 
        name: 'القسم الأول', 
        schoolName: 'مدرسة النجاح الابتدائية', 
        teacherName: '..........................', 
        sessions: [] 
      },
      { 
        id: 'c2', 
        name: 'القسم الثاني', 
        schoolName: 'مدرسة النجاح الابتدائية', 
        teacherName: '..........................', 
        sessions: [] 
      }
    ];
  },
  
  saveClasses: (classes: Class[]) => {
    localStorage.setItem(KEYS.CLASSES, JSON.stringify(classes));
    localStorage.setItem(KEYS.INITIALIZED, 'true');
  },
  
  getAttendance: (): AttendanceRecord[] => {
    try {
      const data = localStorage.getItem(KEYS.ATTENDANCE);
      const records: any[] = data ? JSON.parse(data) : [];
      
      // ترقية السجلات القديمة لتربط عبر studentUid
      let needsUpdate = false;
      const upgraded = records.map(r => {
        if (!r.studentUid) {
          needsUpdate = true;
          return { ...r, studentUid: r.studentId };
        }
        return r;
      });

      if (needsUpdate) {
        storage.saveAttendance(upgraded);
      }
      return upgraded;
    } catch (e) { return []; }
  },
  
  saveAttendance: (records: AttendanceRecord[]) => {
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(records));
  },
  
  getLastImportDate: (): string | null => {
    return localStorage.getItem(KEYS.LAST_IMPORT);
  },
  
  getFullBackup: (): FullBackup => {
    return {
      students: storage.getStudents(),
      classes: storage.getClasses(),
      attendance: storage.getAttendance(),
      exportDate: new Date().toISOString(),
      version: "3.3"
    };
  },
  
  restoreFromBackup: (backup: any): boolean => {
    if (!backup || typeof backup !== 'object') return false;
    
    try {
      if (backup.students) localStorage.setItem(KEYS.STUDENTS, JSON.stringify(backup.students));
      if (backup.classes) localStorage.setItem(KEYS.CLASSES, JSON.stringify(backup.classes));
      if (backup.attendance) localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(backup.attendance));
      
      const now = new Date().toISOString();
      localStorage.setItem(KEYS.LAST_IMPORT, now);
      localStorage.setItem(KEYS.INITIALIZED, 'true');
      return true;
    } catch (e) {
      console.error("Backup Restore Error:", e);
      return false;
    }
  }
};
