import React from 'react';
import { useAuth } from '../lib/auth';
import { Navigate } from 'react-router-dom';
import CoordinatorDashboard from './CoordinatorDashboard';
import TeacherDashboard from './TeacherDashboard';
import DeveloperDashboard from './DeveloperDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'developer') {
    return <DeveloperDashboard />;
  }

  if (user.role === 'coordinator') {
    return <CoordinatorDashboard />;
  }

  return <TeacherDashboard />;
}
