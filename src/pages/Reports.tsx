import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import { Class, Student, Evaluation, EVALUATION_CATEGORIES, EvaluationLevel, User } from '../types';
import { Button } from '../components/ui/Button';
import { ArrowLeft, BarChart2, User as UserIcon, Sun, Moon, FileText, Table, Send, X } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from '../lib/ThemeContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ReportsPage() {
  const { classId } = useParams<{ classId: string }>();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cls, setCls] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [selectedTrimester, setSelectedTrimester] = useState<1 | 2 | 3>(1);
  const [isCoordinatorModalOpen, setIsCoordinatorModalOpen] = useState(false);
  const [coordinators, setCoordinators] = useState<User[]>([]);
  const [selectedCoordinatorId, setSelectedCoordinatorId] = useState<string>('');
  const [teachers, setTeachers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

  useEffect(() => {
    if (user?.role === 'coordinator' || user?.role === 'developer') {
      setTeachers(db.getUsers().filter(u => u.role === 'teacher'));
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'coordinator' || user?.role === 'developer') {
      if (selectedTeacherId) {
        setClasses(db.getClasses().filter(c => c.teacherId === selectedTeacherId));
      } else {
        setClasses([]);
      }
    } else if (user?.role === 'teacher') {
      setClasses(db.getClasses().filter(c => c.teacherId === user.id));
    }
  }, [selectedTeacherId, user]);

  useEffect(() => {
    if (classId) {
      const allClasses = db.getClasses();
      const foundClass = allClasses.find(c => c.id === classId);
      if (foundClass) {
        setCls(foundClass);
        if (user?.role === 'coordinator' || user?.role === 'developer') {
          setSelectedTeacherId(foundClass.teacherId);
        }
        const allStudents = db.getStudents();
        setStudents(allStudents.filter(s => s.classId === classId));
        
        const allEvals = db.getEvaluations();
        setEvaluations(allEvals.filter(e => e.classId === classId));
      } else {
        navigate('/reports');
      }
    } else {
      setCls(null);
      setStudents([]);
      setEvaluations([]);
    }
  }, [classId, navigate, user]);

  const getChartData = () => {
    const trimesterEvals = evaluations.filter(e => e.trimester === selectedTrimester);
    
    return EVALUATION_CATEGORIES.map(category => {
      let bem = 0;
      let dificuldade = 0;
      let naoExecuta = 0;

      category.items.forEach(item => {
        trimesterEvals.forEach(evalRecord => {
          const evalItem = evalRecord.items.find(i => i.itemId === item.id);
          if (evalItem) {
            if (evalItem.level === 'BEM') bem++;
            else if (evalItem.level === 'DIFICULDADE') dificuldade++;
            else if (evalItem.level === 'NAO_EXECUTA') naoExecuta++;
          }
        });
      });

      return {
        name: category.name,
        'Executa Bem': bem,
        'Alguma Dificuldade': dificuldade,
        'Não Executa': naoExecuta
      };
    });
  };

  const trimesterEvals = evaluations.filter(e => e.trimester === selectedTrimester);
  const evaluatedStudentsCount = new Set(trimesterEvals.map(e => e.studentId)).size;

  const getStudentLevelCount = (studentId: string, level: EvaluationLevel) => {
    const studentEval = evaluations.find(e => e.studentId === studentId && e.trimester === selectedTrimester);
    if (!studentEval) return 0;
    return studentEval.items.filter(i => i.level === level).length;
  };

  const exportToCSV = () => {
    if (!cls) return;
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += `Relatório da Turma: ${cls.name} - ${selectedTrimester}º Trimestre\n\n`;
    
    // Categories
    csvContent += "Desempenho por Categoria\n";
    csvContent += "Categoria,Executa Bem,Alguma Dificuldade,Não Executa\n";
    const chartData = getChartData();
    chartData.forEach(row => {
      csvContent += `"${row.name}",${row['Executa Bem']},${row['Alguma Dificuldade']},${row['Não Executa']}\n`;
    });
    
    csvContent += "\nResumo por Aluno\n";
    csvContent += "Nome,Executa Bem,Alguma Dificuldade,Não Executa\n";
    students.forEach(student => {
      const bem = getStudentLevelCount(student.id, 'BEM');
      const dif = getStudentLevelCount(student.id, 'DIFICULDADE');
      const nao = getStudentLevelCount(student.id, 'NAO_EXECUTA');
      csvContent += `"${student.name}",${bem},${dif},${nao}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_${cls.name.replace(/\s+/g, '_')}_trimestre_${selectedTrimester}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    if (!cls) return;
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text(`Relatório: ${cls.name}`, 14, 20);
    doc.setFontSize(12);
    doc.text(`${selectedTrimester}º Trimestre - Desenvolvimento Psicomotor`, 14, 28);
    
    const chartData = getChartData();
    
    autoTable(doc, {
      startY: 35,
      head: [['Categoria', 'Executa Bem', 'Alguma Dificuldade', 'Não Executa']],
      body: chartData.map(row => [
        row.name,
        row['Executa Bem'],
        row['Alguma Dificuldade'],
        row['Não Executa']
      ]),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] } // Indigo 600
    });
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [['Nome do Aluno', 'Executa Bem', 'Alguma Dificuldade', 'Não Executa']],
      body: students.map(student => [
        student.name,
        getStudentLevelCount(student.id, 'BEM'),
        getStudentLevelCount(student.id, 'DIFICULDADE'),
        getStudentLevelCount(student.id, 'NAO_EXECUTA')
      ]),
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] } // Emerald 500
    });
    
    doc.save(`relatorio_${cls.name.replace(/\s+/g, '_')}_trimestre_${selectedTrimester}.pdf`);
  };

  const handleSendToCoordinator = () => {
    if (!cls || !user) return;
    
    // First, generate the PDF
    exportToPDF();

    // Then, fetch coordinators and open modal
    const coords = db.getUsers().filter(u => u.role === 'coordinator');
    if (coords.length === 0) {
      alert('Nenhum coordenador encontrado no sistema.');
      return;
    }
    
    setCoordinators(coords);
    setSelectedCoordinatorId(coords[0].id);
    setIsCoordinatorModalOpen(true);
  };

  const confirmSendToCoordinator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoordinatorId || !cls || !user) return;

    db.addMessage({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      senderId: user.id,
      receiverId: selectedCoordinatorId,
      content: `O professor ${user.name} enviou o relatório da turma ${cls.name} referente ao ${selectedTrimester}º Trimestre.`,
      timestamp: new Date().toISOString(),
      read: false,
      link: `/reports/${cls.id}`,
      linkText: 'Acessar Relatório'
    });

    setIsCoordinatorModalOpen(false);
    alert('Relatório enviado com sucesso para o coordenador selecionado!');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(user?.role === 'teacher' && cls ? `/class/${cls.id}` : '/dashboard')} className="p-2 dark:hover:bg-slate-800 shrink-0">
              <ArrowLeft className="w-5 h-5 dark:text-slate-300" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {cls ? `Relatórios: ${cls.name}` : 'Relatórios'}
              </h1>
              <p className="text-slate-500 dark:text-slate-400">Visão Geral do Desenvolvimento Psicomotor</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <Button variant="ghost" size="sm" onClick={toggleTheme} className="rounded-full w-10 h-10 p-0 shrink-0">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>
            {cls && (
              <>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shrink-0">
                  {[1, 2, 3].map((trim) => (
                    <button
                      key={trim}
                      onClick={() => setSelectedTrimester(trim as 1|2|3)}
                      className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                        selectedTrimester === trim 
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {trim}º Trim.
                    </button>
                  ))}
                </div>
                <div className="flex items-center space-x-2 border-l border-slate-200 dark:border-slate-700 pl-4">
                  {user?.role === 'teacher' && (
                    <Button variant="outline" size="sm" onClick={handleSendToCoordinator} className="dark:border-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400">
                      <Send className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Enviar</span>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={exportToCSV} className="dark:border-slate-700 dark:text-slate-300">
                    <Table className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportToPDF} className="dark:border-slate-700 dark:text-slate-300">
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </>
            )}
          </div>
        </header>

        {(user?.role === 'coordinator' || user?.role === 'developer') && (
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Filtrar por Professor</label>
              <select
                value={selectedTeacherId}
                onChange={(e) => {
                  setSelectedTeacherId(e.target.value);
                  navigate('/reports');
                }}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
              >
                <option value="">Selecione um professor</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Turma</label>
              <select
                value={classId || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    navigate(`/reports/${e.target.value}`);
                  } else {
                    navigate('/reports');
                  }
                }}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                disabled={!selectedTeacherId}
              >
                <option value="">Selecione uma turma</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {!cls ? (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
            <BarChart2 className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg">Selecione um professor e uma turma para visualizar os relatórios.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-6 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 text-indigo-600 dark:text-indigo-400">
                <BarChart2 className="w-6 h-6" />
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Desempenho da Turma por Categoria</h2>
              </div>
              <div className="text-sm font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full">
                {evaluatedStudentsCount} de {students.length} alunos avaliados
              </div>
            </div>
            
            <div className="h-[400px] w-full">
              {trimesterEvals.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={getChartData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                    <XAxis 
                      dataKey="name" 
                      tick={{fontSize: 12, fill: theme === 'dark' ? '#94a3b8' : '#64748b'}} 
                      interval={0} 
                      angle={-45} 
                      textAnchor="end" 
                      height={100} 
                    />
                    <YAxis tick={{fill: theme === 'dark' ? '#94a3b8' : '#64748b'}} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: theme === 'dark' ? '#0f172a' : '#fff',
                        borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                        color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                      }}
                    />
                    <Legend verticalAlign="top" height={36}/>
                    <Bar dataKey="Executa Bem" stackId="a" fill="#10b981" />
                    <Bar dataKey="Alguma Dificuldade" stackId="a" fill="#eab308" />
                    <Bar dataKey="Não Executa" stackId="a" fill="#f97316" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                  <BarChart2 className="w-12 h-12 mb-4 opacity-20" />
                  <p>Nenhuma avaliação registrada para o {selectedTrimester}º Trimestre.</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-6 min-w-0">
            <div className="flex items-center space-x-3 text-emerald-600 dark:text-emerald-400">
              <UserIcon className="w-6 h-6" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Resumo por Aluno</h2>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {students.map(student => {
                const totalBem = getStudentLevelCount(student.id, 'BEM');
                const totalDif = getStudentLevelCount(student.id, 'DIFICULDADE');
                const totalNao = getStudentLevelCount(student.id, 'NAO_EXECUTA');
                const totalAvaliados = totalBem + totalDif + totalNao;

                return (
                  <div key={student.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{student.name}</h3>
                    {totalAvaliados > 0 ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-emerald-700 dark:text-emerald-400">Executa Bem:</span>
                          <span className="font-medium bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full text-emerald-800 dark:text-emerald-300">{totalBem}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-yellow-700 dark:text-yellow-400">Com Dificuldade:</span>
                          <span className="font-medium bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-full text-yellow-800 dark:text-yellow-300">{totalDif}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-orange-700 dark:text-orange-400">Não Executa:</span>
                          <span className="font-medium bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-full text-orange-800 dark:text-orange-300">{totalNao}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400 italic">Ainda não avaliado neste trimestre.</p>
                    )}
                  </div>
                );
              })}
              {students.length === 0 && (
                <div className="text-center text-slate-500 dark:text-slate-400 py-4">
                  Nenhum aluno na turma.
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>

      {isCoordinatorModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Enviar Relatório
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setIsCoordinatorModalOpen(false)} className="p-1 h-auto">
                <X className="w-5 h-5 text-slate-500" />
              </Button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              O PDF do relatório foi gerado. Selecione o coordenador para quem deseja enviar a notificação no sistema:
            </p>
            <form onSubmit={confirmSendToCoordinator} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Coordenador
                </label>
                <select
                  value={selectedCoordinatorId}
                  onChange={(e) => setSelectedCoordinatorId(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                  required
                >
                  {coordinators.map(coord => (
                    <option key={coord.id} value={coord.id}>
                      {coord.name} ({coord.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsCoordinatorModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                  Enviar Notificação
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
