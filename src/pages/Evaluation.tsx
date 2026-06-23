import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import { Student, Class, EVALUATION_CATEGORIES, EvaluationLevel, EvaluationItem } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ArrowLeft, Save, CheckCircle2, AlertCircle, XCircle, Sun, Moon } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/ThemeContext';

export default function EvaluationPage() {
  const { classId, studentId } = useParams<{ classId: string, studentId: string }>();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [student, setStudent] = useState<Student | null>(null);
  const [cls, setCls] = useState<Class | null>(null);
  const [trimester, setTrimester] = useState<1 | 2 | 3>(1);
  const [evaluations, setEvaluations] = useState<Record<number, EvaluationLevel>>({});
  const [evaluationDate, setEvaluationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      if (classId && studentId) {
        const students = await db.getStudents();
        const classes = await db.getClasses();
        const foundStudent = students.find(s => s.id === studentId);
        const foundClass = classes.find(c => c.id === classId);
        
        if (foundStudent && foundClass) {
          setStudent(foundStudent);
          setCls(foundClass);
          await loadExistingEvaluation(studentId, 1);
        } else {
          navigate('/dashboard');
        }
      }
    };
    loadData();
  }, [classId, studentId, navigate]);

  const loadExistingEvaluation = async (sId: string, trim: 1 | 2 | 3) => {
    const allEvals = await db.getEvaluations();
    const existing = allEvals.find(e => e.studentId === sId && e.trimester === trim);
    
    if (existing) {
      const evalMap: Record<number, EvaluationLevel> = {};
      existing.items.forEach(item => {
        evalMap[item.itemId] = item.level;
      });
      setEvaluations(evalMap);
      setEvaluationDate(existing.date.split('T')[0]);
      setNotes(existing.notes || '');
    } else {
      setEvaluations({});
      setEvaluationDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  };

  const handleTrimesterChange = async (trim: 1 | 2 | 3) => {
    setTrimester(trim);
    if (studentId) {
      await loadExistingEvaluation(studentId, trim);
    }
  };

  const handleLevelSelect = (itemId: number, level: EvaluationLevel) => {
    setEvaluations(prev => ({
      ...prev,
      [itemId]: level
    }));
  };

  const handleSave = async () => {
    if (!student || !cls || !user) return;

    const items: EvaluationItem[] = Object.entries(evaluations).map(([itemId, level]) => ({
      itemId: Number(itemId),
      level: level as EvaluationLevel
    }));

    await db.addEvaluation({
      id: Date.now().toString(),
      studentId: student.id,
      classId: cls.id,
      teacherId: user.id,
      trimester,
      date: evaluationDate,
      items,
      notes
    });

    alert('Avaliação salva com sucesso!');
    navigate(`/class/${cls.id}`);
  };

  if (!student || !cls) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 sticky top-4 z-10">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/class/${cls.id}`)} className="p-2 dark:hover:bg-slate-800 shrink-0">
              <ArrowLeft className="w-5 h-5 dark:text-slate-300" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Avaliação: {student.name}</h1>
              <p className="text-slate-500 dark:text-slate-400">Turma: {cls.name}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <Button variant="ghost" size="sm" onClick={toggleTheme} className="rounded-full w-10 h-10 p-0 shrink-0">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shrink-0">
              {[1, 2, 3].map((trim) => (
                <button
                  key={trim}
                  onClick={() => handleTrimesterChange(trim as 1|2|3)}
                  className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                    trimester === trim 
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {trim}º Trim.
                </button>
              ))}
            </div>
            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 ml-auto sm:ml-0">
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </div>
        </header>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm space-y-4 border border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white border-b dark:border-slate-800 pb-2">Detalhes da Avaliação</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Professor(a)</label>
              <Input value={user?.name || ''} disabled className="bg-slate-50 dark:bg-slate-800/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Data da Avaliação</label>
              <Input 
                type="date" 
                value={evaluationDate} 
                onChange={e => setEvaluationDate(e.target.value)} 
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Observações / Notas</label>
              <textarea 
                className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm transition-colors placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-400 dark:focus-visible:ring-indigo-400 min-h-[100px]"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Adicione observações sobre o desenvolvimento do aluno neste trimestre..."
              />
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {EVALUATION_CATEGORIES.map(category => (
            <div key={category.id} className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm space-y-4 border border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white border-b dark:border-slate-800 pb-2">{category.name}</h2>
              
              <div className="space-y-4">
                {category.items.map(item => (
                  <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl gap-4">
                    <span className="text-slate-700 dark:text-slate-300 font-medium md:w-1/2">{item.id}. {item.name}</span>
                    
                    <div className="flex flex-wrap gap-2 md:w-1/2 md:justify-end">
                      <button
                        onClick={() => handleLevelSelect(item.id, 'BEM')}
                        className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                          evaluations[item.id] === 'BEM'
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-500 text-emerald-800 dark:text-emerald-400 shadow-sm'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-200'
                        }`}
                      >
                        <CheckCircle2 className={`w-4 h-4 mr-2 ${evaluations[item.id] === 'BEM' ? 'text-emerald-600' : 'text-slate-400'}`} />
                        Executa bem
                      </button>
                      
                      <button
                        onClick={() => handleLevelSelect(item.id, 'DIFICULDADE')}
                        className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                          evaluations[item.id] === 'DIFICULDADE'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500 text-yellow-800 dark:text-yellow-400 shadow-sm'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-yellow-50 dark:hover:bg-yellow-950/30 hover:border-yellow-200'
                        }`}
                      >
                        <AlertCircle className={`w-4 h-4 mr-2 ${evaluations[item.id] === 'DIFICULDADE' ? 'text-yellow-600' : 'text-slate-400'}`} />
                        Alguma dificuldade
                      </button>

                      <button
                        onClick={() => handleLevelSelect(item.id, 'NAO_EXECUTA')}
                        className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                          evaluations[item.id] === 'NAO_EXECUTA'
                            ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-500 text-orange-800 dark:text-orange-400 shadow-sm'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:border-orange-200'
                        }`}
                      >
                        <XCircle className={`w-4 h-4 mr-2 ${evaluations[item.id] === 'NAO_EXECUTA' ? 'text-orange-600' : 'text-slate-400'}`} />
                        Não executa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
