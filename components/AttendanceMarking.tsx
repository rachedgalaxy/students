
import React, { useState, useEffect, useMemo } from 'react';
import { storage } from '../services/storage';
import { Student, Class, AttendanceRecord, AttendanceStatus, STATUS_LABELS, STATUS_COLORS, WEEK_DAYS } from '../types';
import { CheckCircle2, XCircle, Shirt, AlertCircle, Save, Users, Zap, Search, Calendar } from 'lucide-react';

const AttendanceMarking: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [currentAttendance, setCurrentAttendance] = useState<Record<string, AttendanceStatus | undefined>>({});
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeTick, setTimeTick] = useState(Date.now());
  const [isGenderSorted, setIsGenderSorted] = useState(false);

  // ... (existing code)

  const filteredStudents = useMemo(() => {
    let result = students;
    if (searchTerm) {
      result = result.filter(s =>
        s.name.includes(searchTerm) || s.id.includes(searchTerm)
      );
    }

    if (isGenderSorted) {
      return [...result].sort((a, b) => {
        // Sort by Gender: Male first, then Female
        if (a.gender === b.gender) return a.name.localeCompare(b.name);
        return (a.gender === 'male' ? -1 : 1);
      });
    }

    return result;
  }, [students, searchTerm, isGenderSorted]);

  // ... (UI Render)



  // Update timeTick every minute to trigger re-sort
  useEffect(() => {
    const interval = setInterval(() => setTimeTick(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const currentDayName = useMemo(() => {
    const d = new Date(date);
    return WEEK_DAYS[d.getDay()];
  }, [date]);

  useEffect(() => {
    const allClasses = storage.getClasses();
    const activeClasses = allClasses.filter(c =>
      c.sessions?.some(s => s.day === currentDayName)
    );

    // Sort logic: Current > Upcoming > Past
    activeClasses.sort((a, b) => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const getClassScore = (cls: Class) => {
        const sessions = cls.sessions.filter(s => s.day === currentDayName);
        if (!sessions.length) return 99999;

        // Find best session score for this class (min score is best)
        const scores = sessions.map(s => {
          const [startH, startM] = s.startTime.split(':').map(Number);
          const [endH, endM] = s.endTime.split(':').map(Number);
          const start = startH * 60 + startM;
          const end = endH * 60 + endM;

          if (currentMinutes >= start && currentMinutes <= end) {
            return start; // Priority 1: Current (0 - 1440)
          } else if (currentMinutes < start) {
            return 10000 + start; // Priority 2: Upcoming (10000+)
          } else {
            return 20000 + start; // Priority 3: Past (20000+)
          }
        });
        return Math.min(...scores);
      };

      return getClassScore(a) - getClassScore(b);
    });

    setClasses(activeClasses);

    // Smart Auto-Selection Logic
    // Goal: Synchronize strictly with the schedule.
    // 1. If we have a "Current" class (Priority 1), AUTO-SELECT it.
    //    - Unless the user is ALREADY on a "Current" class (unlikely to have 2 at once, but safe check).
    // 2. If no Current class, revert to "Select if empty" behavior.

    if (activeClasses.length > 0) {
      const bestClass = activeClasses[0];

      // Calculate score again to check if it's strictly "Current" (Schedule Match)
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const sessions = bestClass.sessions.filter(s => s.day === currentDayName);
      const isStrictlyCurrent = sessions.some(s => {
        const [startH, startM] = s.startTime.split(':').map(Number);
        const [endH, endM] = s.endTime.split(':').map(Number);
        const start = startH * 60 + startM;
        const end = endH * 60 + endM;
        return currentMinutes >= start && currentMinutes <= end;
      });

      if (isStrictlyCurrent) {
        // Force selection if it's the current class
        if (selectedClassId !== bestClass.id) {
          setSelectedClassId(bestClass.id);
        }
      } else {
        // Fallback: Select if empty or invalid
        if (!selectedClassId || !activeClasses.find(c => c.id === selectedClassId)) {
          setSelectedClassId(bestClass.id);
        }
      }
    } else {
      setSelectedClassId('');
    }
  }, [currentDayName, timeTick]); // Removed selectedClassId from dependency to avoid loops, let the logic handle updates based on timeTick

  useEffect(() => {
    if (selectedClassId) {
      const allStudents = storage.getStudents();
      // استثناء التلاميذ المؤرشفين (الذين تم حذفهم من هذا القسم)
      const classStudents = allStudents.filter(s => s.classId === selectedClassId && !s.isArchived);
      setStudents(classStudents);

      const allAttendance = storage.getAttendance();
      const existingToday = allAttendance.filter(a => a.classId === selectedClassId && a.date === date);

      const initialMap: Record<string, AttendanceStatus | undefined> = {};
      classStudents.forEach(s => {
        const record = existingToday.find(a => a.studentUid === s.uid);
        initialMap[s.uid] = record ? record.status : undefined;
      });
      setCurrentAttendance(initialMap);
    } else {
      setStudents([]);
      setCurrentAttendance({});
    }
  }, [selectedClassId, date]);

  const handleStatusChange = (studentUid: string, status: AttendanceStatus) => {
    setCurrentAttendance(prev => ({ ...prev, [studentUid]: status }));
  };

  const markAllAsPresent = () => {
    const newMap: Record<string, AttendanceStatus | undefined> = { ...currentAttendance };
    students.forEach(s => {
      if (!newMap[s.uid]) newMap[s.uid] = 'present';
    });
    setCurrentAttendance(newMap);
  };

  const handleSave = () => {
    const unMarkedCount = students.filter(s => !currentAttendance[s.uid]).length;

    if (unMarkedCount > 0) {
      alert(`تنبيه: يوجد ${unMarkedCount} تلاميذ لم يتم تحديد حالتهم بعد.`);
      return;
    }

    const allAttendance = storage.getAttendance();
    const filteredAttendance = allAttendance.filter(a => !(a.classId === selectedClassId && a.date === date));

    const newRecords: AttendanceRecord[] = students.map(s => ({
      id: `${Date.now()}-${s.uid}`,
      studentUid: s.uid,
      studentId: s.id,
      classId: selectedClassId,
      status: currentAttendance[s.uid] as AttendanceStatus,
      date: date,
    }));

    storage.saveAttendance([...filteredAttendance, ...newRecords]);
    alert('تم حفظ كشف الحضور بنجاح.');
  };



  const markedCount = Object.values(currentAttendance).filter(v => v !== undefined).length;

  return (
    <div className="relative space-y-4 max-w-[1600px] mx-auto pb-24 font-cairo">
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-3 items-end justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 w-full">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1">تاريخ المناداة</label>
              <input
                type="date"
                className="w-full bg-slate-50 border-slate-200 rounded-xl py-2 px-3 font-black text-xs text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1">القسم (حصص {currentDayName})</label>
              <select
                className={`w-full bg-slate-50 border-slate-200 rounded-xl py-2 pr-3 pl-8 font-black text-xs text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none transition-all appearance-none ${classes.length === 0 ? 'opacity-50' : ''}`}
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                disabled={classes.length === 0}
              >
                {classes.length === 0 ? (
                  <option value="">لا توجد حصص اليوم ({currentDayName})</option>
                ) : (
                  classes.map(c => {
                    // Find the relevant session for display (same logic as sorting)
                    const now = new Date();
                    const currentMinutes = now.getHours() * 60 + now.getMinutes();

                    // Get today's sessions
                    const todaysSessions = c.sessions.filter(s => s.day === currentDayName);

                    // Find the best session to display (Current > Upcoming > Past)
                    let bestSession = todaysSessions[0];
                    let isCurrent = false;

                    if (todaysSessions.length > 0) {
                      // Sort sessions by relevance to now
                      todaysSessions.sort((a, b) => {
                        const parseTime = (t: string) => {
                          const [h, m] = t.split(':').map(Number);
                          return h * 60 + m;
                        };

                        const startA = parseTime(a.startTime);
                        const endA = parseTime(a.endTime);
                        const startB = parseTime(b.startTime);
                        const endB = parseTime(b.endTime);

                        const getScore = (start: number, end: number) => {
                          if (currentMinutes >= start && currentMinutes <= end) return 0; // Current
                          if (currentMinutes < start) return 1; // Upcoming
                          return 2; // Past
                        };

                        const scoreA = getScore(startA, endA);
                        const scoreB = getScore(startB, endB);

                        if (scoreA !== scoreB) return scoreA - scoreB;
                        return startA - startB; // If same category, earlier first
                      });
                      bestSession = todaysSessions[0];

                      // Check if strictly current
                      const [startH, startM] = bestSession.startTime.split(':').map(Number);
                      const [endH, endM] = bestSession.endTime.split(':').map(Number);
                      const start = startH * 60 + startM;
                      const end = endH * 60 + endM;
                      if (currentMinutes >= start && currentMinutes <= end) {
                        isCurrent = true;
                      }
                    }

                    const timeDisplay = bestSession ? ` (${bestSession.startTime} - ${bestSession.endTime})` : '';
                    const indicator = isCurrent ? ' 🔴' : '';

                    return (
                      <option key={c.id} value={c.id}>
                        {c.name}{timeDisplay}{indicator}
                      </option>
                    );
                  })
                )}
              </select>
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={() => setIsGenderSorted(!isGenderSorted)}
              disabled={students.length === 0}
              className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-black text-[10px] flex items-center justify-center gap-1.5 transition-all border whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed ${isGenderSorted ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
            >
              <Users size={14} /> {isGenderSorted ? 'ترتيب: ذكور / إناث' : 'ترتيب: عادي'}
            </button>
            <button
              onClick={markAllAsPresent}
              disabled={students.length === 0}
              className="flex-1 md:flex-none bg-indigo-50 text-indigo-700 px-5 py-2.5 rounded-xl font-black text-[10px] flex items-center justify-center gap-1.5 hover:bg-indigo-100 transition-all border border-indigo-100 whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Zap size={14} /> البقية حاضر (ح)
            </button>
          </div>
        </div>

        <div className="relative w-full">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Search className="text-slate-400" size={14} />
          </div>
          <input
            type="text"
            placeholder="ابحث بـ # أو بالاسم..."
            className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {classes.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100">
            <Calendar size={32} className="mx-auto mb-2 text-slate-200" />
            <p className="text-slate-300 font-black text-[11px] uppercase tracking-tighter">
              لا توجد حصص مبرمجة ليوم {currentDayName}
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100">
            <Users size={32} className="mx-auto mb-2 text-slate-200" />
            <p className="text-slate-300 font-black text-[11px] uppercase tracking-tighter">
              {students.length === 0 ? 'يرجى إضافة تلاميذ لهذا القسم أولاً' : 'لا توجد نتائج مطابقة للبحث'}
            </p>
          </div>
        ) : (
          filteredStudents.map(student => {
            const status = currentAttendance[student.uid];
            return (
              <div key={student.uid} className={`bg-white p-3 rounded-2xl shadow-sm border transition-all ${status ? 'border-indigo-200 bg-indigo-50/5' : 'border-slate-100'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="min-w-0">
                    <span className="text-[8px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded uppercase tracking-widest"># {student.id}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${student.gender === 'male' ? 'bg-blue-500' : student.gender === 'female' ? 'bg-pink-500' : 'bg-red-500'}`} />
                      <h3 className="font-black text-slate-800 text-xs leading-tight truncate">{student.name}</h3>
                    </div>
                  </div>
                  {status ? (
                    <div className={`shrink-0 px-1.5 py-0.5 rounded-md text-[8px] font-black border ${STATUS_COLORS[status]}`}>
                      {status === 'present' ? 'ح' : status === 'pe_kit' ? 'أ' : status === 'justified' ? 'ب' : 'ج'}
                    </div>
                  ) : (
                    <div className="shrink-0 px-1.5 py-0.5 rounded-md text-[8px] font-black border border-slate-50 bg-slate-50 text-slate-300">
                      ؟
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1">
                  {[
                    { s: 'present', l: 'حاضر (ح)', c: 'bg-emerald-600', ic: CheckCircle2 },
                    { s: 'pe_kit', l: 'بدلة (أ)', c: 'bg-indigo-600', ic: Shirt },
                    { s: 'justified', l: 'مبرر (ب)', c: 'bg-amber-500', ic: AlertCircle },
                    { s: 'absent', l: 'غياب (ج)', c: 'bg-rose-600', ic: XCircle },
                  ].map(btn => (
                    <button
                      key={btn.s}
                      onClick={() => handleStatusChange(student.uid, btn.s as AttendanceStatus)}
                      className={`flex items-center justify-center gap-1 py-2 rounded-xl text-[9px] font-black transition-all border ${status === btn.s ? `${btn.c} border-transparent text-white shadow-sm` : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'}`}
                    >
                      <btn.ic size={10} /> {btn.l}
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Save Bar */}
      {students.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 md:right-64 bg-white/80 backdrop-blur-md border-t border-slate-200 p-3 shadow-2xl z-40 no-print">
          <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-64 flex flex-col gap-1">
              <div className="flex justify-between items-end px-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">اكتمال المناداة</span>
                <span className="text-10px] font-black text-indigo-600">{markedCount} / {students.length}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full border border-slate-50 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${(markedCount / (students.length || 1)) * 100}%` }}
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              className={`w-full sm:w-auto px-10 py-2.5 rounded-xl font-black flex items-center justify-center gap-2 transition-all text-xs shadow-lg ${markedCount === students.length ? 'bg-slate-900 text-white hover:bg-black active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              <Save size={16} /> حفظ الكشف النهائي
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceMarking;
