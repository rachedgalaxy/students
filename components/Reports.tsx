
import React, { useState, useEffect, useMemo } from 'react';
import { storage } from '../services/storage';
import { AttendanceRecord, Class, STATUS_LABELS, Student } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import {
  FileBarChart, TrendingUp, UserX, Info, Calendar,
  Target, AlertTriangle, CheckCircle, ChevronLeft,
  ArrowUpRight, Clock, Users
} from 'lucide-react';

const Reports: React.FC = () => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Default to start of current month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setAttendance(storage.getAttendance());
    setClasses(storage.getClasses());
    setStudents(storage.getStudents());
  }, []);

  // Filtered Data based on Class, Date Range, and Gender
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');

  const filteredData = useMemo(() => {
    return attendance.filter(a => {
      const matchesClass = selectedClassId === 'all' || a.classId === selectedClassId;
      const matchesDate = a.date >= startDate && a.date <= endDate;

      if (!matchesClass || !matchesDate) return false;

      if (genderFilter !== 'all') {
        const student = students.find(s => s.uid === a.studentUid);
        return student?.gender === genderFilter;
      }
      return true;
    });
  }, [attendance, selectedClassId, startDate, endDate, genderFilter, students]);

  // Statistics for Charts and Cards
  const stats = useMemo(() => {
    const counts = {
      present: filteredData.filter(a => a.status === 'present').length,
      pe_kit: filteredData.filter(a => a.status === 'pe_kit').length,
      justified: filteredData.filter(a => a.status === 'justified').length,
      absent: filteredData.filter(a => a.status === 'absent').length,
    };

    const total = filteredData.length;
    const presence = total > 0 ? ((counts.present + counts.pe_kit) / total) * 100 : 0;

    // Demographic Stats (Unique Students in this selection)
    const uniqueStudentUids = Array.from(new Set(filteredData.map(a => a.studentUid)));
    const demographics = {
      male: uniqueStudentUids.filter(uid => students.find(s => s.uid === uid)?.gender === 'male').length,
      female: uniqueStudentUids.filter(uid => students.find(s => s.uid === uid)?.gender === 'female').length,
      unknown: uniqueStudentUids.filter(uid => {
        const g = students.find(s => s.uid === uid)?.gender;
        return g !== 'male' && g !== 'female';
      }).length
    };

    return { counts, total, presence, demographics };
  }, [filteredData, students]);

  // Insights: Find students needing attention
  const atRiskStudents = useMemo(() => {
    const studentAbsenceMap: Record<string, number> = {};
    filteredData.forEach(a => {
      if (a.status === 'absent') {
        studentAbsenceMap[a.studentUid] = (studentAbsenceMap[a.studentUid] || 0) + 1;
      }
    });

    return Object.entries(studentAbsenceMap)
      .map(([uid, count]) => {
        const student = students.find(s => s.uid === uid);
        const cls = classes.find(c => c.id === student?.classId);
        return {
          name: student?.name || 'تلميذ غير موجود',
          id: student?.id || '#',
          className: cls?.name || '-',
          absences: count
        };
      })
      .sort((a, b) => b.absences - a.absences)
      .slice(0, 5); // Top 5 absentees
  }, [filteredData, students, classes]);

  const [isFixModalOpen, setIsFixModalOpen] = useState(false);

  const unknownGenderStudents = useMemo(() => {
    return students.filter(s => !s.gender || (s.gender !== 'male' && s.gender !== 'female') && !s.isArchived);
  }, [students]);

  const handleUpdateGender = (studentUid: string, gender: 'male' | 'female') => {
    const updatedStudents = students.map(s => s.uid === studentUid ? { ...s, gender } : s);
    setStudents(updatedStudents);
    storage.saveStudents(updatedStudents);
  };

  const chartData = [
    { name: 'حاضر (ح)', value: stats.counts.present, color: '#10b981' },
    { name: 'بدون بدلة (أ)', value: stats.counts.pe_kit, color: '#3b82f6' },
    { name: 'مبرر (ب)', value: stats.counts.justified, color: '#f59e0b' },
    { name: 'غياب (ج)', value: stats.counts.absent, color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-20 font-cairo animate-in fade-in duration-500">


      {/* Gender Fix Modal */}
      {isFixModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 leading-relaxed">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2.5 rounded-xl text-red-600"><AlertTriangle size={20} /></div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">تصحيح بيانات الجنس</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">يرجى تحديد الجنس للتلاميذ التاليين لضمان دقة التقارير</p>
                </div>
              </div>
              <button onClick={() => setIsFixModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors"><UserX size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {unknownGenderStudents.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <CheckCircle size={40} className="mx-auto text-emerald-500 mb-2" />
                  <p className="font-black text-xs">رائع! جميع البيانات مكتملة.</p>
                </div>
              ) : (
                unknownGenderStudents.map(student => (
                  <div key={student.uid} className="flex items-center justify-between p-3 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500">
                        {student.id}
                      </div>
                      <div>
                        <h4 className="font-black text-xs text-slate-800">{student.name}</h4>
                        <p className="text-[9px] font-bold text-indigo-500">{classes.find(c => c.id === student.classId)?.name || 'قسم غير معروف'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateGender(student.uid, 'male')}
                        className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl text-[10px] font-black transition-all"
                      >
                        ذكر
                      </button>
                      <button
                        onClick={() => handleUpdateGender(student.uid, 'female')}
                        className="px-4 py-2 bg-pink-50 text-pink-600 hover:bg-pink-600 hover:text-white rounded-xl text-[10px] font-black transition-all"
                      >
                        أنثى
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-center">
              <button onClick={() => setIsFixModalOpen(false)} className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-black transition-all shadow-md">
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Smart Controls Bar (Existing) */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 no-print">
        <div className="flex flex-col xl:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 self-start">
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-100">
              <FileBarChart size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 leading-none">لوحة التقارير الذكية</h3>
              <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tight">تحليل متزامن للأقسام والفترات الزمنية</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full xl:w-auto">
            <div className="relative">
              <Calendar className="absolute right-3 top-2.5 text-slate-400" size={14} />
              <input
                type="date"
                className="w-full bg-slate-50 border-slate-200 rounded-xl py-2 pr-9 pl-3 font-black text-[11px] text-slate-900 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="relative">
              <Calendar className="absolute right-3 top-2.5 text-slate-400" size={14} />
              <input
                type="date"
                className="w-full bg-slate-50 border-slate-200 rounded-xl py-2 pr-9 pl-3 font-black text-[11px] text-slate-900 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="relative">
              <Target className="absolute right-3 top-2.5 text-slate-400" size={14} />
              <select
                className="w-full bg-slate-50 border-slate-200 rounded-xl py-2 pr-9 pl-4 font-black text-[11px] text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 appearance-none cursor-pointer"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                <option value="all">جميع الأقسام</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Demographics / Gender Warning Bar */}
        <div className="flex gap-4 items-stretch mt-4">
          {/* Gender Filter */}
          <div className="relative w-48">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Users size={14} className="text-slate-400" />
            </div>
            <select
              className="w-full bg-slate-50 border-slate-200 rounded-xl py-2 pr-9 pl-4 font-black text-[11px] text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 appearance-none cursor-pointer"
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as any)}
            >
              <option value="all">جميع الجنسين</option>
              <option value="male">الذكور فقط</option>
              <option value="female">الإناث فقط</option>
            </select>
          </div>

          {/* Demographics Summary */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 rounded-xl">
            <div className="flex items-center gap-1.5" title="عدد الذكور">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-[10px] font-black text-slate-600">{stats.demographics.male}</span>
            </div>
            <div className="w-px h-4 bg-slate-200"></div>
            <div className="flex items-center gap-1.5" title="عدد الإناث">
              <div className="w-2 h-2 rounded-full bg-pink-500"></div>
              <span className="text-[10px] font-black text-slate-600">{stats.demographics.female}</span>
            </div>
            {(stats.demographics.unknown > 0) && (
              <>
                <div className="w-px h-4 bg-slate-200"></div>
                <div className="flex items-center gap-1.5 animate-pulse" title="غير محدد">
                  <AlertTriangle size={12} className="text-red-500" />
                  <span className="text-[10px] font-black text-red-600">{stats.demographics.unknown} (يرجى التحديد)</span>
                  <a href="#students" className="text-[9px] underline text-red-400 hover:text-red-600">تصحيح</a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Section: Visuals & Patterns */}
        <div className="lg:col-span-2 space-y-6">

          {/* Main Chart Container with explicit height */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col h-[480px]">
            <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <TrendingUp size={18} className="text-indigo-600" /> تحليل توزيع الحالات
              </h4>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {stats.total} إجمالي السجلات
              </div>
            </div>

            {stats.total > 0 ? (
              <div className="flex-1 w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="45%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                      isAnimationActive={true}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={4} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontFamily: 'Cairo', fontSize: '11px', fontWeight: 'bold', padding: '12px' }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={50}
                      iconType="circle"
                      formatter={(value, entry) => (
                        <span className="font-black text-[11px] px-3 text-slate-600">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-200 py-10">
                <Clock size={64} className="opacity-10 mb-4" />
                <p className="font-black text-sm text-slate-400">لا توجد بيانات للفترة المختارة</p>
                <p className="text-[10px] text-slate-300 mt-1">يرجى تعديل النطاق الزمني أو اختيار قسم آخر</p>
              </div>
            )}
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm group hover:border-emerald-200 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl"><CheckCircle size={20} /></div>
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">نسبة الانضباط</h5>
              </div>
              <p className={`text-3xl font-black leading-none ${stats.presence >= 90 ? 'text-emerald-600' : stats.presence >= 75 ? 'text-indigo-600' : 'text-rose-600'}`}>
                {stats.presence.toFixed(1)}%
              </p>
              <div className="mt-3 h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-1000 ${stats.presence >= 90 ? 'bg-emerald-500' : stats.presence >= 75 ? 'bg-indigo-500' : 'bg-rose-500'}`} style={{ width: `${stats.presence}%` }} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm group hover:border-rose-200 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-rose-50 text-rose-600 p-2.5 rounded-xl"><UserX size={20} /></div>
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">معدل الغيابات</h5>
              </div>
              <p className="text-3xl font-black text-rose-600 leading-none">
                {stats.total > 0 ? ((stats.counts.absent / stats.total) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-[10px] font-bold text-slate-400 mt-2">من إجمالي المنادات في هذه الفترة</p>
            </div>

            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/10 text-white p-2.5 rounded-xl"><ArrowUpRight size={20} /></div>
                <h5 className="text-[10px] font-black text-white/40 uppercase tracking-widest">كفاءة الأداء</h5>
              </div>
              <p className="text-3xl font-black text-white leading-none">
                {stats.total > 0 ? (stats.counts.present + stats.counts.pe_kit) : 0}
              </p>
              <p className="text-[10px] font-bold text-white/50 mt-2">حالة حضور فعلية ناجحة</p>
            </div>
          </div>
        </div>

        {/* Right Section: Smart Insights */}
        <div className="space-y-6">

          {/* At Risk Students - Smart Tracker */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-6 bg-rose-50/50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-rose-600" size={18} />
                <h4 className="text-sm font-black text-slate-800">تلاميذ للمتابعة</h4>
              </div>
              <span className="bg-rose-600 text-white px-2 py-0.5 rounded-lg text-[9px] font-black uppercase">هام</span>
            </div>

            <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
              {atRiskStudents.length > 0 ? (
                atRiskStudents.map((student, idx) => (
                  <div key={idx} className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center justify-between group hover:bg-rose-50 hover:border-rose-100 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xs group-hover:bg-rose-600 transition-colors">
                        {student.id}
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-slate-900 truncate max-w-[120px]">{student.name}</h5>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{student.className}</p>
                      </div>
                    </div>
                    <div className="text-center bg-slate-50 px-3 py-1 rounded-xl border border-slate-100 group-hover:bg-white transition-colors">
                      <p className="text-lg font-black text-rose-600 leading-none">{student.absences}</p>
                      <p className="text-[8px] font-black text-slate-400 uppercase">غيابات</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center opacity-30 space-y-2">
                  <CheckCircle size={40} className="mx-auto text-emerald-600" />
                  <p className="text-[10px] font-black uppercase tracking-widest">انضباط تام في هذه الفترة</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-[9px] font-bold text-slate-400 leading-relaxed px-4">
                يتم عرض التلاميذ الذين سجلوا أكثر من غياب واحد غير مبرر خلال النطاق الزمني المحدد.
              </p>
            </div>
          </div>

          {/* Tips & Education Insight */}
          <div className="bg-indigo-600 p-6 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            <div className="relative z-10 flex items-start gap-4">
              <Info className="shrink-0 mt-1" size={24} />
              <div className="space-y-3">
                <h4 className="text-sm font-black">ملاحظة تربوية</h4>
                <p className="text-[11px] font-bold leading-relaxed text-indigo-10/80">
                  {stats.presence < 70
                    ? "نلاحظ انخفاضاً ملحوظاً في نسبة الحضور خلال هذه الفترة. يُنصح بمراجعة جداول التوقيت أو الاتصال بأولياء الأمور للوقوف على الأسباب."
                    : stats.counts.pe_kit > stats.counts.present
                      ? "نسبة التلاميذ بدون بدلة رياضية مرتفعة. يرجى التأكيد على إحضار لوازم التربية البدنية لضمان فعالية الحصة."
                      : "معدلات الانضباط جيدة جداً في هذه الفترة. حافظ على هذا المستوى من خلال تحفيز التلاميذ المستمرين في الحضور."}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Reports;
