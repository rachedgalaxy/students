
import React, { useState, useEffect, useMemo } from 'react';
import { storage } from '../services/storage';
import { AttendanceRecord, Student, Class, WEEK_DAYS } from '../types';
import {
  Users, UserX, UserCheck, School, AlertCircle,
  Search, Filter, Calendar, Clock, ArrowLeftRight,
  TrendingDown, Download, Upload
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    presentToday: 0,
    absentToday: 0,
    justifiedToday: 0,
    peKitToday: 0
  });

  const [filters, setFilters] = useState({
    search: '',
    day: 'all',
    classId: 'all'
  });

  useEffect(() => {
    const loadedStudents = storage.getStudents();
    const loadedClasses = storage.getClasses();
    const loadedAttendance = storage.getAttendance();
    const today = new Date().toISOString().split('T')[0];

    setStudents(loadedStudents);
    setClasses(loadedClasses);
    setAttendance(loadedAttendance);

    const todayRecords = loadedAttendance.filter(a => a.date === today);

    setStats({
      totalStudents: loadedStudents.length,
      totalClasses: loadedClasses.length,
      presentToday: todayRecords.filter(r => r.status === 'present').length,
      peKitToday: todayRecords.filter(r => r.status === 'pe_kit').length,
      justifiedToday: todayRecords.filter(r => r.status === 'justified').length,
      absentToday: todayRecords.filter(r => r.status === 'absent').length
    });
  }, []);

  // تصفية التلاميذ الغائبين في الأسبوع الأخير
  const recentAbsentees = useMemo(() => {
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);

    return attendance.filter(record => {
      // فقط الغيابات غير المبررة
      if (record.status !== 'absent') return false;

      const recordDate = new Date(record.date);
      if (recordDate < lastWeek || recordDate > today) return false;

      const student = students.find(s => s.uid === record.studentUid);
      if (!student) return false;

      // فلترة حسب القسم
      if (filters.classId !== 'all' && student.classId !== filters.classId) return false;

      // فلترة حسب البحث
      if (filters.search && !student.name.includes(filters.search) && !student.id.includes(filters.search)) return false;

      // فلترة حسب اليوم
      const dayIndex = recordDate.getDay();
      const recordDayName = WEEK_DAYS[dayIndex];
      if (filters.day !== 'all' && recordDayName !== filters.day) return false;

      return true;
    }).map(record => {
      const student = students.find(s => s.uid === record.studentUid);
      const cls = classes.find(c => c.id === record.classId);
      return {
        ...record,
        studentName: student?.name || 'تلميذ محذوف',
        studentId: student?.id || '#',
        className: cls?.name || 'قسم غير معروف',
        dayName: WEEK_DAYS[new Date(record.date).getDay()]
      };
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [attendance, students, classes, filters]);

  const metricCards = [
    { label: 'إجمالي التلاميذ', value: stats.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'حاضر (ح)', value: stats.presentToday, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'بدون بدلة (أ)', value: stats.peKitToday, icon: School, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'مبرر (ب)', value: stats.justifiedToday, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'غياب (ج)', value: stats.absentToday, icon: UserX, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  // Backup Functions
  const handleExportBackup = () => {
    const backup = storage.getFullBackup();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `ams_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const backup = JSON.parse(content);
        if (storage.restoreFromBackup(backup)) {
          alert("تم استعادة النسخة الاحتياطية بنجاح! سيتم تحديث الصفحة.");
          window.location.reload();
        } else {
          alert("فشل في استعادة النسخة. الملف قد يكون تالفاً.");
        }
      } catch (err) {
        alert("حدث خطأ أثناء قراءة الملف.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 font-cairo">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {metricCards.map((card, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <div className={`${card.bg} ${card.color} p-2 rounded-lg`}><card.icon size={16} /></div>
              <span className="text-slate-400 text-[8px] font-black">اليوم</span>
            </div>
            <h3 className="text-slate-500 text-[9px] font-black mb-0.5 uppercase tracking-tight">{card.label}</h3>
            <p className="text-xl font-black text-slate-800 leading-none">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Smart Absentee Tracker Section */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-5 border-b border-slate-50 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <TrendingDown className="text-rose-600" size={18} /> تتبع المتغيبين (آخر 7 أيام)
              </h3>
              <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-[10px] font-black">
                {recentAbsentees.length} حالة غياب
              </span>
            </div>

            {/* Quick Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="relative">
                <Search className="absolute right-2.5 top-2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="ابحث بـ # أو بالاسم..."
                  className="w-full bg-slate-50 border-slate-100 rounded-xl pr-8 pl-3 py-1.5 text-[11px] font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-100 transition-all"
                  value={filters.search}
                  onChange={e => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
              <div className="relative">
                <Filter className="absolute right-2.5 top-2 text-slate-400" size={14} />
                <select
                  className="w-full bg-slate-50 border-slate-100 rounded-xl pr-8 pl-3 py-1.5 text-[11px] font-black text-slate-900 outline-none focus:ring-2 focus:ring-rose-100 appearance-none cursor-pointer"
                  value={filters.classId}
                  onChange={e => setFilters({ ...filters, classId: e.target.value })}
                >
                  <option value="all">كل الأقسام</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="relative">
                <Calendar className="absolute right-2.5 top-2 text-slate-400" size={14} />
                <select
                  className="w-full bg-slate-50 border-slate-100 rounded-xl pr-8 pl-3 py-1.5 text-[11px] font-black text-slate-900 outline-none focus:ring-2 focus:ring-rose-100 appearance-none cursor-pointer"
                  value={filters.day}
                  onChange={e => setFilters({ ...filters, day: e.target.value })}
                >
                  <option value="all">كل الأيام</option>
                  {WEEK_DAYS.filter(d => d !== "الجمعة" && d !== "السبت").map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[400px]">
            {recentAbsentees.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-20 text-slate-300">
                <UserCheck size={48} className="opacity-10 mb-2" />
                <p className="font-black text-xs">لا توجد غيابات مسجلة تطابق الفلاتر</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {recentAbsentees.map((record) => (
                  <div key={record.id} className="p-4 hover:bg-slate-50/50 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center font-black text-xs shadow-sm group-hover:bg-rose-600 group-hover:text-white transition-all">
                        {record.studentId}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">{record.studentName}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                            <School size={10} /> {record.className}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400">•</span>
                          <span className="text-[9px] font-black text-indigo-500 flex items-center gap-1">
                            <Calendar size={10} /> {record.dayName}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black text-slate-800">{record.date.split('-').reverse().join('/')}</p>
                      <div className="flex items-center gap-1 mt-1 justify-end">
                        <Clock size={10} className="text-slate-300" />
                        <span className="text-[8px] font-black text-slate-300 uppercase">سجل الغياب</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-50/50 border-t border-slate-50 text-center">
            <p className="text-[9px] font-bold text-slate-400">
              يتم تحديث هذه القائمة تلقائياً بناءً على آخر المنادات المسجلة في الذاكرة المحلية
            </p>
          </div>
        </div>

        {/* Today's Schedule Panel */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col h-full">
          <h3 className="text-sm font-black text-slate-800 mb-4 border-b pb-2 flex justify-between items-center">
            <span>جدول اليوم</span>
            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">{new Date().toLocaleDateString('ar-EG', { weekday: 'long' })}</span>
          </h3>

          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {(() => {
              const todayIndex = new Date().getDay();
              const todayName = WEEK_DAYS[todayIndex];

              // Expanded vibrant color palette for classes - High Contrast Order
              const CLASS_COLORS = [
                'bg-red-50 border-red-200 text-red-700',      // 1. Red
                'bg-blue-50 border-blue-200 text-blue-700',    // 2. Blue
                'bg-green-50 border-green-200 text-green-700', // 3. Green
                'bg-orange-50 border-orange-200 text-orange-700', // 4. Orange
                'bg-purple-50 border-purple-200 text-purple-700', // 5. Purple
                'bg-teal-50 border-teal-200 text-teal-700',    // 6. Teal
                'bg-pink-50 border-pink-200 text-pink-700',    // 7. Pink
                'bg-yellow-50 border-yellow-200 text-yellow-700', // 8. Yellow
                'bg-slate-50 border-slate-200 text-slate-700', // 9. Slate
                'bg-indigo-50 border-indigo-200 text-indigo-700', // 10. Indigo
                'bg-lime-50 border-lime-200 text-lime-700',    // 11. Lime
                'bg-rose-50 border-rose-200 text-rose-700',    // 12. Rose
                'bg-cyan-50 border-cyan-200 text-cyan-700',    // 13. Cyan
                'bg-amber-50 border-amber-200 text-amber-700', // 14. Amber
                'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700', // 15. Fuchsia
                'bg-emerald-50 border-emerald-200 text-emerald-700', // 16. Emerald
                'bg-violet-50 border-violet-200 text-violet-700', // 17. Violet
                'bg-sky-50 border-sky-200 text-sky-700',       // 18. Sky
              ];

              const getClassColor = (classId: string) => {
                const index = classes.findIndex(c => c.id === classId);
                if (index === -1) return CLASS_COLORS[0];
                return CLASS_COLORS[index % CLASS_COLORS.length];
              };

              // Get all sessions for today across all classes
              const todaysSessions = classes.flatMap(c =>
                c.sessions
                  .filter(s => s.day === todayName)
                  .map(s => ({ ...s, className: c.name, classId: c.id, schoolName: c.schoolName }))
              ).sort((a, b) => a.startTime.localeCompare(b.startTime));

              if (todaysSessions.length === 0) {
                return (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-10 opacity-60">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                      <Clock size={24} />
                    </div>
                    <p className="text-xs font-black text-slate-400">لا توجد حصص مبرمجة لليوم</p>
                    <p className="text-[10px] font-bold text-slate-300">يوم راحة أو عطلة</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {todaysSessions.map((session, idx) => {
                    const now = new Date();
                    const currentMinutes = now.getHours() * 60 + now.getMinutes();
                    const [startH, startM] = session.startTime.split(':').map(Number);
                    const [endH, endM] = session.endTime.split(':').map(Number);
                    const startMinutes = startH * 60 + startM;
                    const endMinutes = endH * 60 + endM;

                    const isCurrent = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
                    const classColor = getClassColor(session.classId);

                    return (
                      <div key={idx} className={`relative p-3 rounded-2xl border flex items-center gap-4 transition-all ${isCurrent ? 'ring-2 ring-indigo-500 shadow-md transform scale-[1.02]' : 'hover:shadow-sm'} ${classColor} bg-opacity-10 border-opacity-20`}>
                        {isCurrent && <span className="absolute top-2 left-2 w-2 h-2 bg-indigo-600 rounded-full animate-pulse shadow-lg shadow-indigo-200"></span>}

                        <div className={`shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center border bg-white/50 backdrop-blur-sm shadow-sm`}>
                          <span className="text-[10px] font-black leading-none">{session.startTime}</span>
                        </div>

                        <div>
                          <h4 className="text-xs font-black leading-tight">{session.className}</h4>
                          <div className="flex items-center gap-2 mt-1 opacity-70">
                            <span className="text-[9px] font-bold mr-1">{session.schoolName}</span>
                            <span className="text-[8px]">•</span>
                            <span className="text-[9px] font-bold dir-ltr">{session.endTime} - {session.startTime}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
