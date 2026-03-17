import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Activity, Sun, Moon } from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';

export default function Welcome() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 transition-colors duration-300">
      <div className="absolute top-6 right-6">
        <Button variant="ghost" size="sm" onClick={toggleTheme} className="rounded-full w-10 h-10 p-0">
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </Button>
      </div>
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex justify-center">
          <div className="bg-indigo-600 dark:bg-indigo-500 p-4 rounded-full">
            <Activity className="w-12 h-12 text-white" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            SADP - Cianorte
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Sistema de Avaliação do Desenvolvimento Psicomotor
          </p>
        </div>

        <div className="pt-8">
          <Button 
            size="lg" 
            className="w-full text-lg"
            onClick={() => navigate('/login')}
          >
            Entrar no Sistema
          </Button>
        </div>
      </div>
    </div>
  );
}
