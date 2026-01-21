
import React, { useState, useEffect, useMemo } from 'react';
import { storage } from '../services/storage';
import { Student, Class, SECURITY_PIN } from '../types';
import { Trash2, Edit2, UserPlus, Search, FileSpreadsheet, User, X, AlertOctagon, UserCheck, ChevronDown, Filter, Plus, AlertCircle, FileDown, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(20);

  const [isAdding, setIsAdding] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Student | null>(null);
  const [importPreview, setImportPreview] = useState<Student[] | null>(null);

  const [securityCode, setSecurityCode] = useState('');

  const [newStudent, setNewStudent] = useState({ id: '', name: '', classId: '', gender: 'male' });

  useEffect(() => {
    const loadedStudents = storage.getStudents();
    const loadedClasses = storage.getClasses();
    setStudents(loadedStudents);
    setClasses(loadedClasses);
    if (loadedClasses.length > 0) {
      setNewStudent(prev => ({ ...prev, classId: loadedClasses[0].id }));
    }
  }, []);

  useEffect(() => {
    setVisibleCount(20);
  }, [searchTerm, selectedClassFilter]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.id.trim() || !newStudent.name.trim() || !newStudent.classId) return;

    // Optional: Check if ID exists in the same class
    const exists = students.some(s => s.id === newStudent.id.trim() && s.classId === newStudent.classId);
    if (exists) {
      alert('تنبيه: يوجد تلميذ بهذا الرقم في نفس القسم.');
      return;
    }

    const studentWithUid: Student = {
      ...newStudent,
      id: newStudent.id.trim(),
      name: newStudent.name.trim(),
      uid: Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
      isArchived: false,
      gender: 'male' // Default to male, user can change later
    };

    const updated = [...students, studentWithUid];
    setStudents(updated);
    storage.saveStudents(updated);
    setNewStudent({ ...newStudent, id: '', name: '' });
    setIsAdding(false);
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    const updatedStudent = { ...editingStudent, isArchived: false };
    const updated = students.map(s => s.uid === editingStudent.uid ? updatedStudent : s);
    setStudents(updated);
    storage.saveStudents(updated);
    setEditingStudent(null);
  };

  const handleConfirmDelete = () => {
    if (securityCode !== SECURITY_PIN || !pendingDelete) return;
    const updated = students.filter(s => s.uid !== pendingDelete.uid);
    setStudents(updated);
    storage.saveStudents(updated);
    const allAttendance = storage.getAttendance();
    storage.saveAttendance(allAttendance.filter(a => a.studentUid !== pendingDelete.uid));
    setPendingDelete(null);
    setSecurityCode('');
  };

  const downloadSampleExcel = () => {
    const data = [
      { '#': '01', 'اللقب': 'محمد', 'الاسم': 'أمين' },
      { '#': '02', 'اللقب': 'بن سالم', 'الاسم': 'عمر' },
      { '#': '03', 'اللقب': 'قادري', 'الاسم': 'زينب' }
    ];
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "قائمة التلاميذ");
    XLSX.writeFile(workbook, "نموذج_قائمة_التلاميذ.xlsx");
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
            classId: newStudent.classId,
            isArchived: false
          };
        }).filter(s => s.id && s.id !== "undefined" && s.name && s.name !== "undefined");

        if (importedStudents.length === 0) {
          alert('لم يتم العثور على بيانات صالحة في الملف.');
          return;
        }

        setImportPreview(importedStudents);
      } catch (err) {
        alert('خطأ في قراءة الملف.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const confirmImport = () => {
    if (!importPreview) return;
    const currentStudents = storage.getStudents();
    const updated = [...currentStudents, ...importPreview];
    setStudents(updated);
    storage.saveStudents(updated);
    setImportPreview(null);
  };

  const filtered = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.includes(searchTerm) || s.id.includes(searchTerm);
      const matchesClass = selectedClassFilter === 'all' || s.classId === selectedClassFilter;
      if (selectedClassFilter !== 'all' && s.isArchived) return false;
      return matchesSearch && matchesClass;
    });
  }, [students, searchTerm, selectedClassFilter]);

  const visibleStudents = filtered.slice(0, visibleCount);

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto pb-16 font-cairo">
      {/* Search & Actions Bar */}
      <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col xl:flex-row justify-between items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
          <button
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
          >
            <UserPlus size={16} /> تلميذ جديد
          </button>

          <div className="flex gap-2">
            <label className="flex-1 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 hover:border-green-400 transition-all group">
              <FileSpreadsheet size={16} className="text-green-600 group-hover:scale-110 transition-transform" /> استيراد قائمة مسار
              <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImportFile} />
            </label>
            <button
              onClick={downloadSampleExcel}
              title="تحميل نموذج ملف Excel"
              className="bg-slate-100 text-slate-600 p-2.5 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center justify-center group"
            >
              <FileDown size={18} className="group-hover:bounce" />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 w-full xl:max-w-3xl">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
              <Search className="text-slate-400" size={15} />
            </div>
            <input
              type="text"
              placeholder="ابحث بـ # أو بالاسم..."
              className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-white font-bold text-xs text-slate-900 placeholder:text-slate-400 transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Filter className="text-slate-400" size={14} />
            </div>
            <select
              className="w-full pr-9 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-xs text-slate-900 focus:ring-2 focus:ring-blue-100 outline-none transition-all appearance-none cursor-pointer"
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
            >
              <option value="all">جميع السجلات ({students.length})</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} (نشط: {students.filter(s => s.classId === c.id && !s.isArchived).length})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute left-3 top-3 text-slate-400 pointer-events-none" size={14} />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5 text-slate-400 font-black text-[12px] uppercase tracking-widest w-24">#</th>
                <th className="px-6 py-3.5 text-slate-400 font-black text-[12px] uppercase tracking-widest">الاسم واللقب</th>
                <th className="px-6 py-3.5 text-slate-400 font-black text-[12px] uppercase tracking-widest">الحالة والقسم</th>
                <th className="px-6 py-3.5 text-slate-400 font-black text-[12px] uppercase tracking-widest text-center w-32">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibleStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-300">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <User size={40} />
                      <p className="font-black text-[10px] uppercase tracking-widest">لا توجد نتائج مطابقة</p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleStudents.map(student => (
                  <tr key={student.uid} className={`group hover:bg-slate-50/50 transition-colors ${student.isArchived ? 'bg-amber-50/20' : ''}`}>
                    <td className="px-6 py-3 text-slate-500 font-mono font-black text-[12px]">{student.id}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${student.gender === 'male' ? 'bg-blue-500' : student.gender === 'female' ? 'bg-pink-500' : 'bg-red-500'}`} title={student.gender === 'male' ? 'ذكر' : student.gender === 'female' ? 'أنثى' : 'يرجى تحديد الجنس'} />
                        <p className={`font-black text-xs ${student.isArchived ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{student.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      {student.isArchived ? (
                        <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 w-fit">
                          <AlertCircle size={10} />
                          <span className="text-[10px] font-black uppercase tracking-tighter">محذوف من القسم (مؤرشف)</span>
                        </div>
                      ) : (
                        <p className="text-indigo-600 font-bold text-[11px]">{classes.find(c => c.id === student.classId)?.name || 'غير محدد'}</p>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => setEditingStudent(student)}
                          className="p-2 text-slate-300 hover:text-blue-600 hover:bg-white rounded-lg shadow-sm transition-all border border-transparent hover:border-slate-100"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setPendingDelete(student)}
                          className="p-2 text-slate-300 hover:text-red-600 hover:bg-white rounded-lg shadow-sm transition-all border border-transparent hover:border-slate-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination / Load More */}
      {filtered.length > visibleCount && (
        <div className="flex flex-col items-center gap-3 pt-4 animate-in fade-in slide-in-from-bottom-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            عرض {visibleCount} من أصل {filtered.length} تلميذ
          </p>
          <button
            onClick={() => setVisibleCount(prev => prev + 20)}
            className="group flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-8 py-2.5 rounded-xl font-black text-xs hover:bg-slate-50 hover:border-blue-400 hover:text-blue-700 transition-all shadow-sm active:scale-95"
          >
            <Plus size={16} className="group-hover:rotate-90 transition-transform" /> تحميل المزيد
          </button>
        </div>
      )}

      {/* Import Confirmation Modal */}
      {importPreview && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 space-y-6 shadow-2xl border-4 border-green-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-center">
              <div className="p-4 bg-green-50 rounded-full text-green-600">
                <FileSpreadsheet size={48} />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-black text-slate-900">تأكيد استيراد البيانات</h3>
              <p className="text-slate-500 font-bold text-sm leading-relaxed">
                لقد وجدنا <span className="text-green-600 font-black text-lg">{importPreview.length}</span> تلميذاً في الملف المرفوع.
                <br /> هل ترغب في إضافتهم إلى النظام الآن؟
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={confirmImport}
                className="w-full bg-green-600 text-white py-5 rounded-[1.5rem] font-black text-lg shadow-xl shadow-green-100 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <CheckCircle2 size={24} /> تأكيد الاستيراد الآن
              </button>
              <button
                onClick={() => setImportPreview(null)}
                className="w-full bg-white text-slate-400 py-4 rounded-[1.5rem] font-black hover:text-slate-900 transition-all"
              >
                إلغاء العملية
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2rem] p-6 shadow-2xl border border-blue-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6 border-b pb-3">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-blue-600" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">إضافة تلميذ جديد</h3>
              </div>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 pr-1 uppercase tracking-widest">الرقم الترتيبي (#)</label>
                <input type="text" className="w-full border-slate-200 bg-slate-50 rounded-xl py-2 px-3 font-mono font-black text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600" value={newStudent.id} onChange={e => setNewStudent({ ...newStudent, id: e.target.value })} placeholder="مثال: 01" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 pr-1 uppercase tracking-widest">الاسم الكامل</label>
                <input type="text" className="w-full border-slate-200 bg-slate-50 rounded-xl py-2 px-3 font-black text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600" value={newStudent.name} onChange={e => setNewStudent({ ...newStudent, name: e.target.value })} placeholder="اللقب والاسم" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 pr-1 uppercase tracking-widest">اختيار القسم</label>
                <div className="relative">
                  <select className="w-full border-slate-200 bg-slate-50 rounded-xl py-2 pr-3 pl-8 font-black text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 appearance-none cursor-pointer" value={newStudent.classId} onChange={e => setNewStudent({ ...newStudent, classId: e.target.value })} required>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <ChevronDown className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" size={14} />
                </div>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[11px] shadow-lg active:scale-95 transition-all">حفظ التلميذ في القائمة</button>
                <button type="button" onClick={() => setIsAdding(false)} className="w-full py-2 text-slate-400 font-black text-[10px]">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2rem] p-6 shadow-2xl border border-indigo-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6 border-b pb-3">
              <div className="flex items-center gap-2">
                <Edit2 size={18} className="text-indigo-600" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">تعديل بيانات التلميذ</h3>
              </div>
              <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 pr-1 uppercase tracking-widest">الرقم الترتيبي (#)</label>
                <input type="text" className="w-full border-slate-200 bg-white rounded-xl py-2 px-3 font-mono font-black text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600 border shadow-inner" value={editingStudent.id} onChange={e => setEditingStudent({ ...editingStudent, id: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 pr-1 uppercase tracking-widest">الاسم الكامل</label>
                <input type="text" className="w-full border-slate-200 bg-white rounded-xl py-2 px-3 font-black text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600 border shadow-inner" value={editingStudent.name} onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })} placeholder="تعديل الاسم" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 pr-1 uppercase tracking-widest">تغيير القسم</label>
                <div className="relative">
                  <select className="w-full border-slate-200 bg-white rounded-xl py-2 pr-3 pl-8 font-black text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600 appearance-none cursor-pointer border shadow-inner" value={editingStudent.classId} onChange={e => setEditingStudent({ ...editingStudent, classId: e.target.value })} required>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <ChevronDown className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" size={14} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 pr-1 uppercase tracking-widest">الجنس</label>
                <div className="flex gap-2 p-1 bg-slate-50 border border-slate-200 rounded-xl relative">
                  <button
                    type="button"
                    onClick={() => setEditingStudent({ ...editingStudent, gender: 'male' })}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${editingStudent.gender === 'male' || !editingStudent.gender ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    ذكر
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingStudent({ ...editingStudent, gender: 'female' })}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${editingStudent.gender === 'female' ? 'bg-pink-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    أنثى
                  </button>
                </div>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-[11px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                  <UserCheck size={16} /> حفظ التعديلات
                </button>
                <button type="button" onClick={() => setEditingStudent(null)} className="w-full py-2 text-slate-400 font-black text-[10px]">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Security Delete Modal */}
      {pendingDelete && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 space-y-6 shadow-2xl border-t-8 border-red-600 animate-in zoom-in-95">
            <div className="flex justify-center"><div className="p-3.5 bg-red-50 rounded-full text-red-600"><AlertOctagon size={40} /></div></div>
            <div className="text-center">
              <h3 className="text-xl font-black text-slate-900">حذف نهائي ومؤكد</h3>
              <p className="text-slate-500 font-bold text-[11px] mt-2 leading-relaxed">
                هل أنت متأكد من حذف التلميذ <span className="text-red-600 font-black">"{pendingDelete.name}"</span> نهائياً؟
                <br /> <span className="text-rose-600 font-black">تحذير:</span> سيتم مسح كافة سجلاته للأبد.
              </p>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-700 uppercase tracking-widest">أدخل رمز الحماية للمتابعة:</label>
              <input type="text" maxLength={4} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 text-center font-black text-2xl tracking-[0.5em] text-slate-900 focus:border-red-600 focus:bg-white outline-none transition-all" value={securityCode} onChange={e => setSecurityCode(e.target.value)} autoFocus />
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <button onClick={handleConfirmDelete} disabled={securityCode !== SECURITY_PIN} className="w-full bg-red-600 text-white py-3.5 rounded-xl font-black text-[11px] shadow-lg disabled:opacity-20 active:scale-95 transition-all flex items-center justify-center gap-2">
                <Trash2 size={16} /> تأكيد الحذف النهائي
              </button>
              <button onClick={() => { setPendingDelete(null); setSecurityCode(''); }} className="w-full text-slate-400 py-1 font-black text-[10px]">تراجع</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;
