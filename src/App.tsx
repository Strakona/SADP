/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { ThemeProvider } from './lib/ThemeContext';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClassDetails from './pages/ClassDetails';
import StudentDetails from './pages/StudentDetails';
import EvaluationPage from './pages/Evaluation';
import ReportsPage from './pages/Reports';
import TeacherClasses from './pages/TeacherClasses';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
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
      </AuthProvider>
    </ThemeProvider>
  );
}
