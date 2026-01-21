
import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import AttendanceMarking from './components/AttendanceMarking';
import AttendanceHistory from './components/AttendanceHistory';
import StudentManagement from './components/StudentManagement';
import ClassManagement from './components/ClassManagement';
import ScheduleManagement from './components/ScheduleManagement';
import Settings from './components/Settings';
import Reports from './components/Reports';
import { View } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'attendance':
        return <AttendanceMarking />;
      case 'classes':
        return <ClassManagement />;
      case 'schedule':
        return <ScheduleManagement />;
      case 'history':
        return <AttendanceHistory />;
      case 'students':
        return <StudentManagement />;
      case 'settings':
        return <Settings />;
      case 'reports':
        return <Reports />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentView={currentView} onViewChange={setCurrentView}>
      {renderContent()}
    </Layout>
  );
};

export default App;
