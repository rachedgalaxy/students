
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { storage } from '../services/storage';
import { Class, WEEK_DAYS, ClassSession, SECURITY_PIN } from '../types';
import {
  CalendarDays, Printer, Clock, School, User,
  Filter, Trash2, Building2, AlertOctagon, Timer, FileText,
  ChevronDown, Check, X
} from 'lucide-react';

interface DisplaySession extends ClassSession {
  classId: string;
  className: string;
  schoolName: string;
  teacherName: string;
  province?: string;
}

const ScheduleManagement: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(['all']);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ classId: string, sessionIndex: number, name: string } | null>(null);
  const [securityCode, setSecurityCode] = useState('');

  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();

    // Close filter dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = () => {
    setClasses(storage.getClasses());
  };

  const handleConfirmDelete = () => {
    if (securityCode !== SECURITY_PIN || !pendingDelete) return;

    const targetClass = classes.find(c => c.id === pendingDelete.classId);
    if (targetClass) {
      const updatedSessions = targetClass.sessions.filter((_, i) => i !== pendingDelete.sessionIndex);
      const updatedClasses = classes.map(c => c.id === pendingDelete.classId ? { ...c, sessions: updatedSessions } : c);
      setClasses(updatedClasses);
      storage.saveClasses(updatedClasses);
    }

    setPendingDelete(null);
    setSecurityCode('');
  };

  const toggleClassSelection = (classId: string) => {
    if (classId === 'all') {
      setSelectedClassIds(['all']);
    } else {
      setSelectedClassIds(prev => {
        // If 'all' was selected, replace it with the specific class
        if (prev.includes('all')) return [classId];

        // Toggle the specific class
        const newSelection = prev.includes(classId)
          ? prev.filter(id => id !== classId)
          : [...prev, classId];

        // If nothing is selected, default back to 'all'
        return newSelection.length === 0 ? ['all'] : newSelection;
      });
    }
  };

  // Calculate academic year string dynamically
  const academicYear = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    if (currentMonth >= 7) {
      return `${currentYear} / ${currentYear + 1}`;
    } else {
      return `${currentYear - 1} / ${currentYear}`;
    }
  }, []);

  // Calculate total hours for selected classes
  const schoolStats = useMemo(() => {
    const stats: Record<string, { hours: number, sessions: number }> = {};

    classes.forEach(cls => {
      // Only count if class is in current selection
      if (selectedClassIds.includes('all') || selectedClassIds.includes(cls.id)) {
        cls.sessions?.forEach(sess => {
          if (!stats[cls.schoolName]) {
            stats[cls.schoolName] = { hours: 0, sessions: 0 };
          }

          const [startH, startM] = sess.startTime.split(':').map(Number);
          const [endH, endM] = sess.endTime.split(':').map(Number);
          const durationHours = (endH + endM / 60) - (startH + startM / 60);

          stats[cls.schoolName].hours += Math.max(0, durationHours);
          stats[cls.schoolName].sessions += 1;
        });
      }
    });

    return stats;
  }, [classes, selectedClassIds]);

  const getDaySessions = (day: string) => {
    const allSessions: DisplaySession[] = [];

    classes.forEach(cls => {
      // Multi-filter logic
      const isSelected = selectedClassIds.includes('all') || selectedClassIds.includes(cls.id);
      if (!isSelected) return;

      cls.sessions?.forEach((sess) => {
        if (sess.day === day) {
          allSessions.push({
            ...sess,
            classId: cls.id,
            className: cls.name,
            schoolName: cls.schoolName,
            teacherName: cls.teacherName,
            province: cls.province
          });
        }
      });
    });

    return allSessions.sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  // Expanded vibrant color palette for classes
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
    // Determine index based on the master list of classes to ensure uniqueness
    const index = classes.findIndex(c => c.id === classId);
    if (index === -1) return CLASS_COLORS[0]; // Fallback

    // Cycle through colors if more classes than colors
    return CLASS_COLORS[index % CLASS_COLORS.length];
  };

  const workingDays = WEEK_DAYS.filter(d => d !== "الجمعة" && d !== "السبت");

  // Professional Print Generation
  const generateProfessionalPrint = () => {
    const activeClasses = classes.filter(c => selectedClassIds.includes('all') || selectedClassIds.includes(c.id));
    if (activeClasses.length === 0) {
      alert("يرجى اختيار قسم واحد على الأقل للطباعة");
      return;
    }

    const firstClass = activeClasses[0];
    const currentProvince = firstClass?.province || '................';
    const currentTeacher = firstClass?.teacherName || '................';

    let tableRows = workingDays.map(day => {
      const sessions = getDaySessions(day);
      if (sessions.length === 0) {
        return `<tr><td class="day-cell">${day}</td><td colspan="3" class="empty-day">لا توجد حصص مبرمجة</td></tr>`;
      }

      return sessions.map((sess, idx) => `
        <tr>
          ${idx === 0 ? `<td class="day-cell" rowspan="${sessions.length}">${day}</td>` : ''}
          <td class="time-cell">${sess.startTime} - ${sess.endTime}</td>
          <td class="class-cell">${sess.className}</td>
          <td class="school-cell">${sess.schoolName}</td>
        </tr>
      `).join('');
    }).join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>جدول التوقيت الأسبوعي - المخصص</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
          @page { 
            size: A4 landscape; 
            margin: 8mm; 
          }
          
          @media print {
            html, body {
              margin: 0 !important;
              padding: 0 !important;
            }
          }
          body { font-family: 'Cairo', sans-serif; margin: 0; padding: 3mm; color: #000; background: #fff; line-height: 1.2; font-size: 11px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 10px; font-weight: 700; border-bottom: 1.5px solid #000; padding-bottom: 4px; }
          .title { text-align: center; font-size: 18px; font-weight: 900; margin: 8px 0; text-decoration: underline; }
          table { width: 100%; border-collapse: collapse; margin-top: 5px; border: 2px solid #000; }
          th, td { border: 1px solid #000; padding: 6px 4px; text-align: center; font-size: 11px; }
          th { background: #f0f0f0 !important; font-weight: 900; font-size: 12px; }
          .day-cell { font-weight: 900; background: #fafafa !important; width: 80px; font-size: 12px; }
          .time-cell { font-weight: 700; width: 120px; direction: ltr; }
          .class-cell { font-weight: 900; font-size: 13px; }
          .empty-day { color: #888; font-style: italic; }
          .footer { margin-top: 20px; display: flex; justify-content: space-between; padding: 0 60px; }
          .signature-box { text-align: center; }
          .signature-space { height: 40px; margin-top: 5px; width: 150px; }
          @media print { .no-print { display: none; } }
          .print-btn { position: fixed; bottom: 15px; left: 15px; padding: 8px 16px; background: #000; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-family: Cairo; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <p>وزارة التربية الوطنية</p>
            <p>مديرية التربية لولاية ${currentProvince}</p>
          </div>
          <div>
            <p>السنة الدراسية: ${academicYear}</p>
            <p>الأستاذ(ة): ${currentTeacher}</p>
          </div>
        </div>
        <h1 class="title">جدول التوقيت الأسبوعي</h1>
        <table>
          <thead>
            <tr>
              <th>اليوم</th>
              <th>التوقيت</th>
              <th>القسم / الفوج</th>
              <th>المؤسسة</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="footer">
          <div class="signature-box">
            <p>توقيع الأستاذ(ة)</p>
            <div class="signature-space"></div>
          </div>
          <div class="signature-box">
            <p>توقيع وختم المدير(ة)</p>
            <div class="signature-space"></div>
          </div>
        </div>
        <button class="print-btn no-print" onclick="window.print()">تأكيد الطباعة</button>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getFilterButtonLabel = () => {
    if (selectedClassIds.includes('all')) return 'كل الأقسام';
    if (selectedClassIds.length === 1) {
      const cls = classes.find(c => c.id === selectedClassIds[0]);
      return cls ? cls.name : 'قسم واحد مختار';
    }
    return `تم اختيار ${selectedClassIds.length} أقسام`;
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-16 font-cairo">

      {/* 1. Work Hours Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(schoolStats).map(([school, data], idx) => {
          const stats = data as { hours: number; sessions: number };
          return (
            <div key={idx} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 group hover:shadow-md transition-all">
              <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Timer size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">حجم العمل الأسبوعي</p>
                <h4 className="text-xs font-black text-slate-800 truncate max-w-[150px]">{school}</h4>
                <p className="text-xl font-black text-indigo-600 leading-none mt-1">
                  {stats.hours.toFixed(1)} <span className="text-[10px] text-slate-400">ساعة / أسبوع</span>
                </p>
              </div>
            </div>
          );
        })}
        {Object.keys(schoolStats).length === 0 && (
          <div className="col-span-full bg-slate-50 p-5 rounded-3xl border-2 border-dashed border-slate-200 text-center">
            <p className="text-xs font-black text-slate-400">لا توجد مؤسسات في التحديد الحالي لحساب الساعات</p>
          </div>
        )}
      </div>

      {/* 2. Top Bar Controls */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 p-2.5 rounded-xl text-white shadow-md">
            <CalendarDays size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 leading-none">مخطط الجدول الزمني</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tight">إدارة الحصص وتوزيع الساعات</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto relative" ref={filterRef}>
          {/* Smart Multi-Select Dropdown */}
          <div className="relative md:w-64">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`w-full bg-slate-50 border ${isFilterOpen ? 'border-indigo-400 ring-2 ring-indigo-50' : 'border-slate-200'} rounded-xl py-2.5 pr-10 pl-4 font-black text-xs text-slate-900 flex items-center justify-between transition-all outline-none`}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Filter className={`${selectedClassIds.includes('all') ? 'text-slate-400' : 'text-indigo-600'}`} size={16} />
                <span className="truncate">{getFilterButtonLabel()}</span>
              </div>
              <ChevronDown className={`text-slate-400 transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} size={14} />
            </button>

            {isFilterOpen && (
              <div className="absolute top-full right-0 left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[100] p-2 animate-in fade-in slide-in-from-top-2 duration-200 min-w-[200px]">
                <div className="max-h-[300px] overflow-y-auto space-y-1">
                  <button
                    onClick={() => toggleClassSelection('all')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-right transition-colors ${selectedClassIds.includes('all') ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50 text-slate-700'}`}
                  >
                    <span className="text-xs font-black">كل الأقسام</span>
                    {selectedClassIds.includes('all') && <Check size={14} />}
                  </button>

                  <div className="h-px bg-slate-50 my-1 mx-2" />

                  {classes.map(c => (
                    <button
                      key={c.id}
                      onClick={() => toggleClassSelection(c.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-right transition-colors ${selectedClassIds.includes(c.id) ? 'bg-indigo-50 text-indigo-700 font-black' : 'hover:bg-slate-50 text-slate-600 font-bold'}`}
                    >
                      <span className="text-xs">{c.name}</span>
                      {selectedClassIds.includes(c.id) && <div className="bg-indigo-600 text-white rounded-md p-0.5"><Check size={10} /></div>}
                    </button>
                  ))}
                </div>

                {!selectedClassIds.includes('all') && (
                  <div className="mt-2 pt-2 border-t border-slate-50 flex justify-between px-2">
                    <button onClick={() => setSelectedClassIds(['all'])} className="text-[10px] font-black text-rose-500 hover:underline flex items-center gap-1">
                      <X size={10} /> مسح الكل
                    </button>
                    <span className="text-[10px] font-black text-slate-300">تم تحديد {selectedClassIds.length}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={generateProfessionalPrint}
            title="طباعة الحصص المختارة (A4)"
            className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-md flex items-center justify-center w-11 h-11 active:scale-95"
          >
            <Printer size={20} />
          </button>
        </div>
      </div>

      {/* 3. Schedule Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 print:hidden">
        {workingDays.map((day) => (
          <div key={day} className="flex flex-col gap-3">
            <div className="bg-slate-900 p-3 rounded-2xl text-center shadow-lg">
              <h4 className="text-xs font-black text-white">{day}</h4>
            </div>

            <div className="flex-1 space-y-3 min-h-[350px]">
              {getDaySessions(day).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100 p-4 text-center opacity-30">
                  <Clock size={24} className="mb-1" />
                  <p className="text-[9px] font-bold">يوم متاح</p>
                </div>
              ) : (
                getDaySessions(day).map((sess, sessIdx) => (
                  <div
                    key={`${sess.classId}-${sess.startTime}-${sessIdx}`}
                    className={`p-4 rounded-3xl border-r-4 shadow-sm transition-all relative group/card hover:scale-[1.02] ${getClassColor(sess.classId)}`}
                  >
                    <div className="absolute top-2 left-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          const cls = classes.find(c => c.id === sess.classId);
                          const idx = cls?.sessions.findIndex(s => s.day === day && s.startTime === sess.startTime) ?? -1;
                          setPendingDelete({ classId: sess.classId, sessionIndex: idx, name: `${sess.className} (${day})` });
                        }}
                        className="p-1.5 bg-white rounded-lg hover:bg-rose-50 text-rose-600 shadow-sm border border-rose-100"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <div className="flex items-center justify-end mb-2">
                      <div className="bg-white/50 px-2 py-0.5 rounded-lg flex items-center gap-1 text-[10px] font-black text-slate-700">
                        <Clock size={10} />
                        <span dir="ltr">{sess.startTime} - {sess.endTime}</span>
                      </div>
                    </div>

                    <h5 className="font-black text-sm mb-1 truncate text-slate-900">{sess.className}</h5>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 opacity-70">
                        <Building2 size={10} className="shrink-0" />
                        <p className="text-[9px] font-bold truncate">{sess.schoolName}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 4. Security Delete Modal */}
      {
        pendingDelete && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white w-full max-sm rounded-[2.5rem] p-8 space-y-6 shadow-2xl border-t-8 border-red-600 animate-in zoom-in-95">
              <div className="flex justify-center">
                <div className="p-3.5 bg-red-50 rounded-full text-red-600">
                  <AlertOctagon size={40} />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-slate-900">حذف حصة من الجدول</h3>
                <p className="text-slate-500 font-bold text-[11px] mt-2 leading-relaxed">
                  هل أنت متأكد من حذف الحصة الخاصة بـ <span className="text-red-600 font-black">"{pendingDelete.name}"</span>؟
                  <br /> سيتم مسحها من جدول التوقيت نهائياً.
                </p>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-700 uppercase tracking-widest">أدخل رمز الحماية للمتابعة:</label>
                <input
                  type="text"
                  maxLength={4}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 text-center font-black text-2xl tracking-[0.5em] text-slate-900 focus:border-red-600 focus:bg-white outline-none transition-all"
                  value={securityCode}
                  onChange={e => setSecurityCode(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={handleConfirmDelete}
                  disabled={securityCode !== SECURITY_PIN}
                  className="w-full bg-red-600 text-white py-3.5 rounded-xl font-black text-[11px] shadow-lg disabled:opacity-20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> تأكيد الحذف
                </button>
                <button onClick={() => { setPendingDelete(null); setSecurityCode(''); }} className="w-full text-slate-400 py-1 font-black text-[10px]">تراجع</button>
              </div>
            </div>
          </div>
        )
      }

      {/* Info Legend */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row items-center gap-5 shadow-sm">
        <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
          <School size={28} />
        </div>
        <div>
          <h4 className="text-sm font-black text-slate-900">نظام تحليل ساعات العمل الذكي</h4>
          <p className="text-[11px] font-bold text-slate-500 leading-relaxed max-w-4xl">
            يمكنك الآن اختيار عدة أقسام لعرض جداولها معاً وحساب مجموع ساعاتها الأسبوعية في مكان واحد. هذا يساعدك على رؤية صورة أشمل لتوزيعك الزمني عبر المؤسسات المختلفة. عند الطباعة، سيتم إنشاء جدول موحد للأقسام المختارة فقط.
          </p>
        </div>
      </div>

    </div >
  );
};

export default ScheduleManagement;
