
import React, { useState, useEffect, useRef } from 'react';
import { storage } from '../services/storage';
import { Class, Student, WEEK_DAYS, ClassSession, SECURITY_PIN } from '../types';
import {
  Trash2, Plus, School, Edit3,
  UserPlus, FileSpreadsheet, Users,
  X, UserMinus, AlertOctagon, Eraser, Building2, MapPin, User, ChevronDown, Clock, Calendar, Info, FileDown, CheckCircle2
} from 'lucide-react';
import * as XLSX from 'xlsx';

type DeleteAction = {
  type: 'class' | 'student' | 'clear_all' | 'session';
  uid?: string;
  id?: string;
  sessionIndex?: number;
  name: string;
};

const ClassManagement: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [selectedClassForStudents, setSelectedClassForStudents] = useState<Class | null>(null);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [pendingDelete, setPendingDelete] = useState<DeleteAction | null>(null);
  const [importPreview, setImportPreview] = useState<Student[] | null>(null);

  const [securityCode, setSecurityCode] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formSectionRef = useRef<HTMLFormElement>(null);

  const [formData, setFormData] = useState<Omit<Class, 'id'>>({
    name: '',
    schoolName: '',
    province: '',
    teacherName: '',
    sessions: []
  });

  const [newSession, setNewSession] = useState<ClassSession>({
    day: "الأحد",
    startTime: '08:00',
    endTime: '10:00'
  });

  const [quickStudent, setQuickStudent] = useState({ id: '', name: '' });

  useEffect(() => {
    setClasses(storage.getClasses());
  }, []);

  useEffect(() => {
    if (selectedClassForStudents) {
      refreshStudentList();
    }
  }, [selectedClassForStudents]);

  const refreshStudentList = () => {
    if (!selectedClassForStudents) return;
    const all = storage.getStudents();
    setClassStudents(all.filter(s => s.classId === selectedClassForStudents.id && !s.isArchived));
  };

  const scrollToForm = () => {
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.schoolName) return;

    let updatedClasses: Class[];
    if (editingId) {
      updatedClasses = classes.map(c => c.id === editingId ? { ...formData, id: editingId } : c);
    } else {
      const newClass: Class = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9)
      };
      updatedClasses = [...classes, newClass];
    }

    setClasses(updatedClasses);
    storage.saveClasses(updatedClasses);
    resetForm();
  };

  const handleAddQuickStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassForStudents || !quickStudent.id || !quickStudent.name) return;

    const all = storage.getStudents();
    const newS: Student = {
      uid: Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
      id: quickStudent.id,
      name: quickStudent.name,
      classId: selectedClassForStudents.id,
      isArchived: false
    };

    const updated = [...all, newS];
    storage.saveStudents(updated);
    setQuickStudent({ id: '', name: '' });
    refreshStudentList();
  };

  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassForStudents) return;
    const updatedClass = {
      ...selectedClassForStudents,
      sessions: [...(selectedClassForStudents.sessions || []), { ...newSession }]
    };
    const updatedClasses = classes.map(c => c.id === updatedClass.id ? updatedClass : c);
    setClasses(updatedClasses);
    storage.saveClasses(updatedClasses);
    setSelectedClassForStudents(updatedClass);
  };

  const handleRemoveSession = (index: number) => {
    if (!selectedClassForStudents) return;
    const updatedSessions = selectedClassForStudents.sessions.filter((_, i) => i !== index);
    const updatedClass = { ...selectedClassForStudents, sessions: updatedSessions };
    const updatedClasses = classes.map(c => c.id === updatedClass.id ? updatedClass : c);
    setClasses(updatedClasses);
    storage.saveClasses(updatedClasses);
    setSelectedClassForStudents(updatedClass);
  };

  const downloadSampleExcel = () => {
    const data = [
      { '#': '01', 'اللقب': 'محمد', 'الاسم': 'أمين' },
      { '#': '02', 'اللقب': 'بن سالم', 'الاسم': 'عمر' }
    ];
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "قائمة التلاميذ");
    XLSX.writeFile(workbook, "نموذج_قائمة_التلاميذ.xlsx");
  };

  const handleImportStudents = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClassForStudents) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet) as any[];

        const importedStudents: Student[] = data.map(row => {
          const id = String(row['رقم التعريف'] || row['#'] || row['ID'] || row['رقم التسجيل'] || row['id']);
          let fullName = '';
          if (row['اللقب'] && row['الاسم']) {
            fullName = `${row['اللقب']} ${row['الاسم']}`;
          } else {
            fullName = String(row['الاسم الكامل'] || row['الاسم'] || row['Name'] || row['name']);
          }

          return {
            uid: Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
            id: id.trim(),
            name: fullName.trim(),
            classId: selectedClassForStudents.id,
            isArchived: false
          };
        }).filter(s => s.id && s.id !== "undefined" && s.name && s.name !== "undefined");

        if (importedStudents.length === 0) {
          alert('الملف فارغ أو لا يحتوي على بيانات صالحة.');
          return;
        }

        setImportPreview(importedStudents);
      } catch (err) { alert('خطأ في القراءة.'); }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmImport = () => {
    if (!importPreview) return;
    const allStudents = storage.getStudents();
    const updated = [...allStudents, ...importPreview];
    storage.saveStudents(updated);
    refreshStudentList();
    setImportPreview(null);
  };

  const handleConfirmAction = () => {
    if (securityCode !== SECURITY_PIN || !pendingDelete) return;
    const allS = storage.getStudents();
    if (pendingDelete.type === 'class' && pendingDelete.id) {
      const updatedClasses = classes.filter(cls => cls.id !== pendingDelete.id);
      setClasses(updatedClasses);
      storage.saveClasses(updatedClasses);
      const updatedStudents = allS.map(s => s.classId === pendingDelete.id ? { ...s, isArchived: true } : s);
      storage.saveStudents(updatedStudents);
    } else if (pendingDelete.type === 'student' && pendingDelete.uid) {
      const updatedStudents = allS.map(s => s.uid === pendingDelete.uid ? { ...s, isArchived: true } : s);
      storage.saveStudents(updatedStudents);
      refreshStudentList();
    } else if (pendingDelete.type === 'clear_all' && selectedClassForStudents) {
      const updatedStudents = allS.map(s => s.classId === selectedClassForStudents.id ? { ...s, isArchived: true } : s);
      storage.saveStudents(updatedStudents);
      refreshStudentList();
    } else if (pendingDelete.type === 'session' && pendingDelete.sessionIndex !== undefined) {
      handleRemoveSession(pendingDelete.sessionIndex);
    }
    setPendingDelete(null);
    setSecurityCode('');
  };

  const resetForm = () => {
    setFormData({ name: '', schoolName: '', province: '', teacherName: '', sessions: [] });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (c: Class) => {
    setFormData({ name: c.name, schoolName: c.schoolName || '', province: c.province || '', teacherName: c.teacherName || '', sessions: c.sessions || [] });
    setEditingId(c.id);
    setIsFormOpen(true);
    scrollToForm();
  };

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto pb-16 font-cairo">
      <input type="file" className="hidden" ref={fileInputRef} accept=".xlsx,.xls,.csv" onChange={handleImportStudents} />

      {/* Import Preview Modal (Inside Management) */}
      {importPreview && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 space-y-6 shadow-2xl border-4 border-green-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-center"><div className="p-4 bg-green-50 rounded-full text-green-600"><FileSpreadsheet size={48} /></div></div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-black text-slate-900">تأكيد استيراد القائمة</h3>
              <p className="text-slate-500 font-bold text-sm leading-relaxed">
                تم استخراج <span className="text-green-600 font-black text-lg">{importPreview.length}</span> تلميذاً للقسم: <span className="text-indigo-600 font-black">{selectedClassForStudents?.name}</span>.
                <br /> هل أنت متأكد من إضافتهم الآن؟
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={confirmImport} className="w-full bg-green-600 text-white py-5 rounded-[1.5rem] font-black text-lg shadow-xl shadow-green-100 active:scale-95 transition-all flex items-center justify-center gap-3">
                <CheckCircle2 size={24} /> تأكيد الاستيراد والمتابعة
              </button>
              <button onClick={() => setImportPreview(null)} className="w-full bg-white text-slate-400 py-4 rounded-[1.5rem] font-black hover:text-slate-900 transition-all">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200 gap-4">
        <div className="flex items-center gap-2.5"><div className="bg-blue-600 p-2 rounded-xl text-white shadow-md shadow-blue-50"><School size={18} /></div><div><h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">إدارة الأقسام</h3><p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">تخصيص الأفواج التربوية والأساتذة</p></div></div>
        {!isFormOpen && (<button onClick={() => { resetForm(); setIsFormOpen(true); scrollToForm(); }} className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"><Plus size={16} /> إضافة قسم</button>)}
      </div>

      {isFormOpen && (
        <form ref={formSectionRef} onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-xl border border-blue-50 animate-in zoom-in-95 duration-200 space-y-6 scroll-mt-20">
          <div className="flex items-center justify-between border-b pb-3"><div className="flex items-center gap-2 text-blue-700"><Edit3 size={16} /><h4 className="text-xs font-black uppercase tracking-tight">{editingId ? 'تعديل بيانات القسم' : 'إنشاء قسم دراسي جديد'}</h4></div><button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 pr-1 uppercase tracking-widest">اسم المؤسسة</label><div className="relative"><Building2 className="absolute right-3 top-2.5 text-slate-400" size={14} /><input type="text" className="w-full border-slate-200 bg-slate-50 rounded-xl pr-9 pl-3 py-2 text-xs font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-100" value={formData.schoolName} onChange={e => setFormData({ ...formData, schoolName: e.target.value })} placeholder="مدرسة النجاح" required /></div></div>
            <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 pr-1 uppercase tracking-widest">الولاية</label><div className="relative"><MapPin className="absolute right-3 top-2.5 text-slate-400" size={14} /><input type="text" className="w-full border-slate-200 bg-slate-50 rounded-xl pr-9 pl-3 py-2 text-xs font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-100" value={formData.province} onChange={e => setFormData({ ...formData, province: e.target.value })} placeholder="مثال: الجزائر" /></div></div>
            <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 pr-1 uppercase tracking-widest">الأستاذ المسؤول</label><div className="relative"><User className="absolute right-3 top-2.5 text-slate-400" size={14} /><input type="text" className="w-full border-slate-200 bg-slate-50 rounded-xl pr-9 pl-3 py-2 text-xs font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-100" value={formData.teacherName} onChange={e => setFormData({ ...formData, teacherName: e.target.value })} placeholder="الاسم الكامل" required /></div></div>
            <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 pr-1 uppercase tracking-widest">اسم القسم</label><input type="text" className="w-full border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-100" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="سنة خامسة 1" required /></div>
          </div>
          <div className="flex gap-2 justify-end pt-4"><button type="button" onClick={resetForm} className="px-6 py-2 rounded-xl font-black text-[10px] text-slate-400">إلغاء</button><button type="submit" className="bg-green-600 text-white px-10 py-2 rounded-xl font-black text-[10px] shadow-lg">حفظ البيانات</button></div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map(c => (
          <div key={c.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 transition-all group">
            <div className="flex justify-between mb-3"><div className="bg-blue-50 text-blue-600 p-2 rounded-xl"><School size={20} /></div><div className="flex gap-0.5"><button onClick={() => handleEdit(c)} className="p-1.5 text-slate-300 hover:text-blue-600 transition-all"><Edit3 size={14} /></button><button onClick={() => setPendingDelete({ type: 'class', id: c.id, name: c.name })} className="p-1.5 text-slate-300 hover:text-red-600 transition-all"><Trash2 size={14} /></button></div></div>
            <div className="mb-4 space-y-0.5"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate">{c.schoolName} {c.province && `- ${c.province}`}</p><h4 className="text-lg font-black text-slate-800 leading-tight">{c.name}</h4><p className="text-[10px] font-bold text-indigo-500 pt-1">الأستاذ: {c.teacherName || 'غير محدد'}</p><p className="text-[9px] font-bold text-slate-400">عدد الحصص: {c.sessions?.length || 0}</p></div>
            <button onClick={() => setSelectedClassForStudents(c)} className="w-full flex items-center justify-center gap-2 py-2 bg-slate-900 text-white text-[10px] font-black rounded-xl shadow-md hover:bg-black transition-all"><Users size={14} /> إدارة القائمة والمواعيد</button>
          </div>
        ))}
      </div>

      {selectedClassForStudents && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50"><div className="flex items-center gap-3"><div className="bg-blue-600 p-2 rounded-xl text-white"><Users size={18} /></div><div><h3 className="text-sm font-black text-slate-900 leading-none">إدارة القسم: {selectedClassForStudents.name}</h3><p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{selectedClassForStudents.schoolName}</p></div></div><button onClick={() => setSelectedClassForStudents(null)} className="p-1.5 text-slate-400 hover:text-slate-900 transition-all"><X size={20} /></button></div>
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="space-y-4"><div className="flex items-center gap-2 text-indigo-700 border-b pb-2"><Clock size={16} /><h4 className="text-xs font-black uppercase tracking-tight">إعدادات مواعيد الحصص الأسبوعية</h4></div><form onSubmit={handleAddSession} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100"><div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase px-1">اليوم</label><div className="relative"><select className="w-full border-slate-200 bg-white rounded-xl py-2 pr-3 pl-8 font-black text-[11px] text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 appearance-none cursor-pointer" value={newSession.day} onChange={e => setNewSession({ ...newSession, day: e.target.value })}>{WEEK_DAYS.filter(d => d !== "الجمعة" && d !== "السبت").map(day => <option key={day} value={day}>{day}</option>)}</select><ChevronDown className="absolute left-2.5 top-2.5 text-slate-400" size={14} /></div></div><div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase px-1">وقت البدء</label><input type="time" className="w-full border-slate-200 bg-white rounded-xl py-2 px-3 text-[11px] font-black text-black outline-none focus:ring-2 focus:ring-indigo-100" value={newSession.startTime} onChange={e => setNewSession({ ...newSession, startTime: e.target.value })} /></div><div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase px-1">وقت الانتهاء</label><input type="time" className="w-full border-slate-200 bg-white rounded-xl py-2 px-3 text-[11px] font-black text-black outline-none focus:ring-2 focus:ring-indigo-100" value={newSession.endTime} onChange={e => setNewSession({ ...newSession, endTime: e.target.value })} /></div><div className="flex items-end"><button type="submit" className="w-full bg-indigo-600 text-white rounded-xl font-black text-[10px] py-2.5 flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-md"><Plus size={14} /> إضافة الموعد</button></div></form><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">{selectedClassForStudents.sessions && selectedClassForStudents.sessions.length > 0 ? (selectedClassForStudents.sessions.map((session, idx) => (<div key={idx} className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm flex items-center justify-between group/sess"><div className="flex items-center gap-3"><div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><Calendar size={14} /></div><div><p className="text-xs font-black text-slate-800">{session.day}</p><p className="text-[10px] font-bold text-slate-400">{session.startTime} - {session.endTime}</p></div></div><button onClick={() => setPendingDelete({ type: 'session', sessionIndex: idx, name: `موعد يوم ${session.day}` })} className="p-1.5 text-slate-300 hover:text-red-600 transition-colors"><Trash2 size={14} /></button></div>))) : (<div className="col-span-full py-8 text-center text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200"><p className="text-[11px] font-black uppercase tracking-tight">لا توجد مواعيد مخصصة لهذا القسم بعد</p></div>)}</div></div>
              <div className="space-y-4"><div className="flex items-center gap-2 text-blue-700 border-b pb-2"><Users size={16} /><h4 className="text-xs font-black uppercase tracking-tight">إدارة قائمة التلاميذ</h4></div><div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex gap-2 items-start mb-2"><Info className="text-amber-600 shrink-0" size={16} /><p className="text-[10px] font-bold text-amber-900 leading-relaxed">تنبيه: حذف تلميذ من هنا سيقوم بفك ارتباطه بالقسم فقط (أرشفة) ولن يحذف سجلاته الغيابية.</p></div><form onSubmit={handleAddQuickStudent} className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-blue-50/30 p-3 rounded-xl border border-blue-50"><div className="md:col-span-1"><input type="text" placeholder="#" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-black outline-none focus:ring-2 focus:ring-blue-100 text-slate-900" value={quickStudent.id} onChange={e => setQuickStudent({ ...quickStudent, id: e.target.value })} /></div><div className="md:col-span-2"><input type="text" placeholder="الاسم الكامل" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-black outline-none focus:ring-2 focus:ring-blue-100 text-slate-900" value={quickStudent.name} onChange={e => setQuickStudent({ ...quickStudent, name: e.target.value })} /></div><button type="submit" className="bg-blue-600 text-white rounded-lg font-black text-[10px] py-1.5 flex items-center justify-center gap-1.5 hover:bg-blue-700"><UserPlus size={14} /> إضافة تلميذ</button></form><div className="flex justify-between items-center px-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">المسجلون النشطون: {classStudents.length}</p><div className="flex gap-1.5"><button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 font-black text-[9px] hover:bg-emerald-100 transition-all"><FileSpreadsheet size={12} /> استيراد Excel</button><button onClick={downloadSampleExcel} className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-lg border border-slate-200 font-black text-[9px] hover:bg-indigo-600 hover:text-white transition-all"><FileDown size={12} /> نموذج Excel</button><button onClick={() => setPendingDelete({ type: 'clear_all', name: `قائمة تلاميذ ${selectedClassForStudents.name}` })} className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 rounded-lg border border-rose-100 font-black text-[9px] hover:bg-rose-100 transition-all"><Eraser size={12} /> مسح القائمة</button></div></div><div className="border border-slate-50 rounded-xl overflow-hidden"><table className="w-full text-right border-collapse"><thead className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50"><tr><th className="px-5 py-3 w-16 text-center">#</th><th className="px-5 py-3">اسم التلميذ</th><th className="px-5 py-3 text-center w-24">إجراءات</th></tr></thead><tbody className="divide-y divide-slate-50">{classStudents.length === 0 ? (<tr><td colSpan={3} className="px-5 py-8 text-center text-slate-300 font-black text-[10px] uppercase tracking-tighter">لا يوجد تلاميذ نشطون في هذا القسم</td></tr>) : (classStudents.map(student => (<tr key={student.uid} className="hover:bg-slate-50/30"><td className="px-5 py-2 font-mono text-[11px] font-black text-slate-400 text-center">{student.id}</td><td className="px-5 py-2 font-black text-slate-800 text-xs">{student.name}</td><td className="px-5 py-2 text-center"><button onClick={() => setPendingDelete({ type: 'student', uid: student.uid, name: student.name })} className="p-1.5 text-slate-300 hover:text-red-600 transition-all" title="إزالة من القسم"><UserMinus size={14} /></button></td></tr>)))}</tbody></table></div></div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center"><button onClick={() => setSelectedClassForStudents(null)} className="px-12 py-3 bg-slate-900 text-white rounded-xl font-black text-xs shadow-md active:scale-95 transition-all">تم وحفظ التغييرات</button></div>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-sm rounded-[2.5rem] p-8 space-y-6 shadow-2xl border-t-8 border-red-600 animate-in zoom-in-95">
            <div className="flex justify-center"><div className="p-3.5 bg-red-50 rounded-full text-red-600"><AlertOctagon size={40} /></div></div>
            <div className="text-center">
              <h3 className="text-xl font-black text-slate-900">تأكيد الإجراء</h3>
              <p className="text-slate-500 font-bold text-[11px] mt-2 leading-relaxed">هل أنت متأكد من {pendingDelete.type === 'student' ? 'إزالة من القسم' : 'حذف'} <span className="text-red-600 font-black">"{pendingDelete.name}"</span>؟</p>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-700 uppercase tracking-widest">أدخل رمز الحماية للمتابعة:</label>
              <input type="text" maxLength={4} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 text-center font-black text-2xl tracking-[0.5em] text-slate-900 focus:border-red-600 focus:bg-white outline-none transition-all" value={securityCode} onChange={e => setSecurityCode(e.target.value)} autoFocus />
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <button onClick={handleConfirmAction} disabled={securityCode !== SECURITY_PIN} className="w-full bg-red-600 text-white py-3.5 rounded-xl font-black text-[11px] shadow-lg disabled:opacity-20 active:scale-95 transition-all flex items-center justify-center gap-2"><Trash2 size={16} /> تأكيد التنفيذ</button>
              <button onClick={() => { setPendingDelete(null); setSecurityCode(''); }} className="w-full text-slate-400 py-1 font-black text-[10px]">تراجع</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassManagement;
