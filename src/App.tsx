/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { ThemeProvider } from './lib/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClassDetails from './pages/ClassDetails';
import StudentDetails from './pages/StudentDetails';
import EvaluationPage from './pages/Evaluation';
import ReportsPage from './pages/Reports';
import TeacherClasses from './pages/TeacherClasses';

const AppContent = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/class/:classId" element={<ClassDetails />} />
        <Route path="/student/:classId/:studentId" element={<StudentDetails />} />
        <Route path="/evaluate/:classId/:studentId" element={<EvaluationPage />} />
        <Route path="/reports/:classId?" element={<ReportsPage />} />
        <Route path="/turmas/:teacherId" element={<TeacherClasses />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
