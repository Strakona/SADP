import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import { Student, Class, Evaluation } from '../types';
import { Button } from '../components/ui/Button';
import { ArrowLeft, User as UserIcon, Sun, Moon, TrendingUp, FileText, Send, X } from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';
import { useAuth } from '../lib/auth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EVALUATION_CATEGORIES } from '../types';

export default function StudentDetails() {
  const { classId, studentId } = useParams<{ classId: string, studentId: string }>();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [student, setStudent] = useState<Student | null>(null);
  const [cls, setCls] = useState<Class | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isCoordinatorModalOpen, setIsCoordinatorModalOpen] = useState(false);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [selectedCoordinatorId, setSelectedCoordinatorId] = useState<string>('');

  useEffect(() => {
    if (classId && studentId) {
      const students = db.getStudents();
      const classes = db.getClasses();
      const allEvals = db.getEvaluations();
      
      const foundStudent = students.find(s => s.id === studentId);
      const foundClass = classes.find(c => c.id === classId);
      
      if (foundStudent && foundClass) {
        setStudent(foundStudent);
        setCls(foundClass);
        
        // Get all evaluations for this student, sorted by trimester
        const studentEvals = allEvals
          .filter(e => e.studentId === studentId)
          .sort((a, b) => a.trimester - b.trimester);
        setEvaluations(studentEvals);
      } else {
        navigate('/dashboard');
      }
    }
  }, [classId, studentId, navigate]);

  if (!student || !cls) return null;

  // Prepare data for the chart
  const chartData = evaluations.map(ev => {
    const bemCount = ev.items.filter(i => i.level === 'BEM').length;
    const difCount = ev.items.filter(i => i.level === 'DIFICULDADE').length;
    const naoCount = ev.items.filter(i => i.level === 'NAO_EXECUTA').length;
    
    return {
      name: `${ev.trimester}º Tri`,
      'Executa Bem': bemCount,
      'Alguma Dificuldade': difCount,
      'Não Executa': naoCount,
    };
  });

  const generateStudentPDF = () => {
    if (!student || !cls) return;
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text(`Relatório Individual: ${student.name}`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Turma: ${cls.name}`, 14, 28);
    doc.text(`Data de Nascimento: ${new Date(student.birthDate).toLocaleDateString('pt-BR')}`, 14, 34);

    let currentY = 45;

    if (evaluations.length === 0) {
      doc.text("Nenhuma avaliação registrada para este aluno.", 14, currentY);
      doc.save(`relatorio_aluno_${student.name.replace(/\s+/g, '_')}.pdf`);
      return;
    }

    evaluations.forEach((ev, index) => {
      if (index > 0) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(14);
      doc.text(`${ev.trimester}º Trimestre - Avaliação Psicomotora`, 14, currentY);
      doc.setFontSize(10);
      doc.text(`Data da Avaliação: ${new Date(ev.date).toLocaleDateString('pt-BR')}`, 14, currentY + 6);
      
      currentY += 15;

      const tableData: any[] = [];
      EVALUATION_CATEGORIES.forEach(category => {
        tableData.push([{ content: category.name, colSpan: 2, styles: { fillColor: [241, 245, 249], fontStyle: 'bold' } }]);
        category.items.forEach(item => {
          const evalItem = ev.items.find(i => i.itemId === item.id);
          let levelText = 'Não Avaliado';
          if (evalItem) {
            if (evalItem.level === 'BEM') levelText = 'Executa Bem';
            else if (evalItem.level === 'DIFICULDADE') levelText = 'Alguma Dificuldade';
            else if (evalItem.level === 'NAO_EXECUTA') levelText = 'Não Executa';
          }
          tableData.push([item.name, levelText]);
        });
      });

      autoTable(doc, {
        startY: currentY,
        head: [['Habilidade', 'Nível de Execução']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 9 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      if (ev.notes) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Observações do Professor:", 14, currentY);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        
        const splitNotes = doc.splitTextToSize(ev.notes, 180);
        doc.text(splitNotes, 14, currentY + 6);
        currentY += (splitNotes.length * 5) + 10;
      }
    });

    doc.save(`relatorio_aluno_${student.name.replace(/\s+/g, '_')}.pdf`);
  };

  const handleSendToCoordinator = () => {
    if (!cls || !user || !student) return;
    
    // Generate PDF first
    generateStudentPDF();

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
    if (!selectedCoordinatorId || !cls || !user || !student) return;

    db.addMessage({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      senderId: user.id,
      receiverId: selectedCoordinatorId,
      content: `O professor ${user.name} enviou o relatório individual do aluno ${student.name} (Turma: ${cls.name}).`,
      timestamp: new Date().toISOString(),
      read: false,
      link: `/student/${cls.id}/${student.id}`,
      linkText: 'Acessar Aluno'
    });

    setIsCoordinatorModalOpen(false);
    alert('Relatório individual enviado com sucesso para o coordenador!');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/class/${cls.id}`)} className="p-2 dark:hover:bg-slate-800 shrink-0">
              <ArrowLeft className="w-5 h-5 dark:text-slate-300" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Detalhes do Aluno</h1>
              <p className="text-slate-500 dark:text-slate-400">{student.name} - {cls.name}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <Button variant="ghost" size="sm" onClick={toggleTheme} className="rounded-full w-10 h-10 p-0 shrink-0">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>
            {user?.role === 'teacher' && (
              <Button variant="outline" size="sm" onClick={handleSendToCoordinator} className="dark:border-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400">
                <Send className="w-4 h-4 mr-2" />
                Enviar
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={generateStudentPDF} className="dark:border-slate-700 dark:text-slate-300">
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button onClick={() => navigate(`/evaluate/${cls.id}/${student.id}`)} className="bg-indigo-600 hover:bg-indigo-700">
              Nova Avaliação
            </Button>
          </div>
        </header>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm space-y-6 border border-slate-200 dark:border-slate-800 h-fit">
            <div className="flex items-center space-x-3 text-indigo-600 dark:text-indigo-400">
              <UserIcon className="w-6 h-6" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Perfil</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nome Completo</p>
                <p className="text-lg font-medium text-slate-900 dark:text-white">{student.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Data de Nascimento</p>
                <p className="text-lg font-medium text-slate-900 dark:text-white">
                  {new Date(student.birthDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Turma</p>
                <p className="text-lg font-medium text-slate-900 dark:text-white">{cls.name}</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6 min-w-0">
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm space-y-6 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-3 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-6 h-6" />
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Evolução do Desempenho</h2>
              </div>

              {evaluations.length > 0 ? (
                <div className="h-80 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                      <XAxis dataKey="name" stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} />
                      <YAxis stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                          borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                          color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="Executa Bem" stroke="#10b981" strokeWidth={3} activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="Alguma Dificuldade" stroke="#eab308" strokeWidth={3} />
                      <Line type="monotone" dataKey="Não Executa" stroke="#f97316" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  Nenhuma avaliação registrada para este aluno ainda.
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm space-y-6 border border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Histórico de Avaliações</h2>
              
              <div className="space-y-4">
                {evaluations.map(ev => (
                  <div key={ev.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{ev.trimester}º Trimestre</h3>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {new Date(ev.date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    {ev.notes && (
                      <div className="mt-2 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Observações do Professor:</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{ev.notes}</p>
                      </div>
                    )}
                    <div className="mt-4 flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/evaluate/${cls.id}/${student.id}`)}>
                        Editar Avaliação
                      </Button>
                    </div>
                  </div>
                ))}
                {evaluations.length === 0 && (
                  <p className="text-slate-500 dark:text-slate-400 text-center py-4">Sem histórico disponível.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isCoordinatorModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Enviar Relatório Individual
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
