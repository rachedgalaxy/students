
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  History, 
  FileBarChart, 
  Settings,
  GraduationCap,
  Menu,
  X,
  School,
  Users,
  CalendarDays,
  Briefcase
} from 'lucide-react';
import { View } from '../types';
import { storage } from '../services/storage';

interface LayoutProps {
  children: React.ReactNode;
  currentView: View;
  onViewChange: (view: View) => void;
}

interface Profile {
  teacher: string;
  schools: string[];
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onViewChange }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    const refreshProfiles = () => {
      const classes = storage.getClasses();
      if (classes && classes.length > 0) {
        // خريطة لتخزين الأستاذ مع مجموعة (Set) من المؤسسات لضمان عدم تكرار المدرسة للأستاذ الواحد
        const teacherMap = new Map<string, { name: string, schools: Set<string> }>();
        
        const normalize = (text: string) => text.trim().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();

        classes.forEach(c => {
          const teacherName = c.teacherName?.trim() || 'أستاذ غير مسجل';
          const schoolName = c.schoolName?.trim() || 'مؤسسة غير معرفة';
          
          // تجاهل الأسماء التي تحتوي على نقاط فقط
          if (teacherName.replace(/\./g, '').trim().length === 0) return;

          const key = normalize(teacherName);
          
          if (!teacherMap.has(key)) {
            teacherMap.set(key, { name: teacherName, schools: new Set([schoolName]) });
          } else {
            teacherMap.get(key)?.schools.add(schoolName);
          }
        });

        const aggregatedProfiles: Profile[] = Array.from(teacherMap.values()).map(item => ({
          teacher: item.name,
          schools: Array.from(item.schools)
        }));

        setProfiles(aggregatedProfiles);
      }
    };

    refreshProfiles();
    window.addEventListener('storage', refreshProfiles);
    return () => window.removeEventListener('storage', refreshProfiles);
  }, [currentView]);

  const menuItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'attendance', label: 'تسجيل الحضور', icon: ClipboardCheck },
    { id: 'students', label: 'إدارة التلاميذ', icon: Users },
    { id: 'classes', label: 'الأقسام والقوائم', icon: School },
    { id: 'schedule', label: 'جدول التوقيت', icon: CalendarDays },
    { id: 'history', label: 'سجل الغيابات', icon: History },
    { id: 'reports', label: 'التقارير والإحصائيات', icon: FileBarChart },
    { id: 'settings', label: 'الإعدادات والنسخ', icon: Settings },
  ];

  const handleNavClick = (view: View) => {
    onViewChange(view);
    setIsMobileMenuOpen(false);
  };

  const getInitials = (name: string) => {
    if (!name || name.includes('..') || name.includes('غير مسجل')) return 'أ';
    const parts = name.trim().split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 font-cairo overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between no-print z-50">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
            <GraduationCap size={20} />
          </div>
          <h1 className="text-lg font-bold text-slate-800">دفتر الغياب الذكي</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-0 z-40 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 
        w-64 bg-white border-l border-slate-200 flex flex-col no-print
        ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}>
        <div className="hidden md:flex p-6 border-b border-slate-100 items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-100">
            <GraduationCap size={24} />
          </div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">دفتر الغياب</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto mt-16 md:mt-0">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id as View)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                currentView === item.id 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
              }`}
            >
              <item.icon size={20} />
              <span className="font-bold whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Unique Teacher Profiles Card with All Schools */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="mb-3 flex items-center gap-2 px-1">
            <Briefcase size={14} className="text-indigo-600" />
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">المستخدمون النشطون</h3>
          </div>
          
          <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
            {profiles.length > 0 ? (
              profiles.map((prof, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm group hover:border-indigo-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0 shadow-sm">
                      {getInitials(prof.teacher)}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-black text-slate-900 text-[12px] truncate leading-tight mb-2" title={prof.teacher}>
                        {prof.teacher}
                      </p>
                      
                      <div className="space-y-1.5">
                        {prof.schools.map((school, sIdx) => (
                          <div key={sIdx} className="flex items-center gap-1.5">
                            <School size={10} className="text-slate-400 shrink-0" />
                            <p className="font-bold text-slate-500 text-[9px] truncate" title={school}>
                              {school}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-50">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter">متصل وآمن</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">في انتظار البيانات</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="hidden md:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-8 no-print shrink-0">
          <h2 className="text-lg font-black text-slate-700">
            {menuItems.find(i => i.id === currentView)?.label}
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 font-bold bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">
              {new Date().toLocaleDateString('ar-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50">
          {children}
        </div>
      </main>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Layout;
