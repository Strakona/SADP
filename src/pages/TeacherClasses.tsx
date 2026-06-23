import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import { Class, User } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../lib/auth';
import { ArrowLeft, Users, ChevronRight, Sun, Moon, Building2, Edit2, X, Save } from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';

export default function TeacherClasses() {
  const { teacherId } = useParams<{ teacherId: string }>();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [teacher, setTeacher] = useState<User | null>(null);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [editClassYear, setEditClassYear] = useState(new Date().getFullYear());
  const [editClassSchool, setEditClassSchool] = useState('');

  const loadClasses = async () => {
    if (teacherId) {
      const allClasses = await db.getClasses();
      setClasses(allClasses.filter(c => c.teacherId === teacherId));
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (user?.role !== 'coordinator' && user?.role !== 'developer') {
        navigate('/dashboard');
        return;
      }

      if (teacherId) {
        const allUsers = await db.getUsers();
        const foundTeacher = allUsers.find(u => u.id === teacherId && u.role === 'teacher');
        if (foundTeacher) {
          setTeacher(foundTeacher);
          await loadClasses();
        } else {
          navigate('/dashboard');
        }
      }
    };
    loadData();
  }, [teacherId, user, navigate]);

  const handleEditClass = (e: React.MouseEvent, cls: Class) => {
    e.stopPropagation();
    setEditingClass(cls);
    setEditClassName(cls.name);
    setEditClassYear(cls.year);
    setEditClassSchool(cls.school || '');
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;

    const updatedClass: Class = {
      ...editingClass,
      name: editClassName,
      year: editClassYear,
      school: editClassSchool || undefined
    };

    await db.updateClass(updatedClass);
    await loadClasses();
    setEditingClass(null);
  };

  if (!teacher) {
    return null;
  }

  const classesBySchool = classes.reduce((acc, cls) => {
    const school = cls.school || 'Sem escola definida';
    if (!acc[school]) acc[school] = [];
    acc[school].push(cls);
    return acc;
  }, {} as Record<string, Class[]>);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="p-2 dark:hover:bg-slate-800 shrink-0">
              <ArrowLeft className="w-5 h-5 dark:text-slate-300" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Turmas do Professor</h1>
              <p className="text-slate-500 dark:text-slate-400">{teacher.name}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <Button variant="ghost" size="sm" onClick={toggleTheme} className="rounded-full w-10 h-10 p-0 shrink-0">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>
          </div>
        </header>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm space-y-6 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3 text-emerald-600 dark:text-emerald-400">
            <Users className="w-6 h-6" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Turmas Cadastradas</h2>
          </div>

          <div className="space-y-8">
            {Object.entries(classesBySchool).map(([school, schoolClasses]: [string, Class[]]) => (
              <div key={school} className="space-y-4">
                <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <Building2 className="w-5 h-5" />
                  <h3 className="text-lg font-medium">{school}</h3>
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs py-0.5 px-2 rounded-full ml-2">
                    {schoolClasses.length} {schoolClasses.length === 1 ? 'turma' : 'turmas'}
                  </span>
                </div>
                <div className="grid gap-4">
                  {schoolClasses.map(cls => (
                    <div 
                      key={cls.id} 
                      className="flex flex-col p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm transition-all bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800"
                    >
                      {editingClass?.id === cls.id ? (
                        <form onSubmit={handleUpdateClass} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Nome da Turma</label>
                              <Input 
                                value={editClassName}
                                onChange={e => setEditClassName(e.target.value)}
                                className="h-9 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Ano</label>
                              <Input 
                                type="number"
                                value={editClassYear}
                                onChange={e => setEditClassYear(Number(e.target.value))}
                                className="h-9 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Escola</label>
                              <Input 
                                list="edit-schools-list"
                                value={editClassSchool}
                                onChange={e => setEditClassSchool(e.target.value)}
                                className="h-9 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                                placeholder="Sem escola"
                              />
                              {teacher?.schools && teacher.schools.length > 0 && (
                                <datalist id="edit-schools-list">
                                  {teacher.schools.map(s => <option key={s} value={s} />)}
                                </datalist>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button type="button" size="sm" variant="ghost" onClick={() => setEditingClass(null)}>
                              <X className="w-4 h-4 mr-2" />
                              Cancelar
                            </Button>
                            <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                              <Save className="w-4 h-4 mr-2" />
                              Salvar
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex items-center justify-between cursor-pointer" onClick={() => navigate(`/class/${cls.id}`)}>
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 dark:text-white text-lg">{cls.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Ano: {cls.year}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                              onClick={(e) => handleEditClass(e, cls)}
                              title="Editar Turma"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-full text-indigo-600 dark:text-indigo-400 ml-2">
                              <ChevronRight className="w-5 h-5" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {classes.length === 0 && (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                Nenhuma turma cadastrada para este professor.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
