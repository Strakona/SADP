import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import { Class, Student } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ArrowLeft, UserPlus, Users, Activity, FileBarChart, Trash2, Sun, Moon, Eye, FileText, Send, X } from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';
import { useAuth } from '../lib/auth';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EVALUATION_CATEGORIES, User } from '../types';

export default function ClassDetails() {
  const { classId } = useParams<{ classId: string }>();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cls, setCls] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentBirth, setNewStudentBirth] = useState('');
  const [isCoordinatorModalOpen, setIsCoordinatorModalOpen] = useState(false);
  const [coordinators, setCoordinators] = useState<User[]>([]);
  const [selectedCoordinatorId, setSelectedCoordinatorId] = useState<string>('');
  const [selectedTrimester, setSelectedTrimester] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    if (classId) {
      const classes = db.getClasses();
      const foundClass = classes.find(c => c.id === classId);
      if (foundClass) {
        setCls(foundClass);
        loadStudents(classId);
      } else {
        navigate('/dashboard');
      }
    }
  }, [classId, navigate]);

  const loadStudents = (cId: string) => {
    const allStudents = db.getStudents();
    setStudents(allStudents.filter(s => s.classId === cId));
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName || !newStudentBirth || !classId) return;

    const newStudent: Student = {
      id: Date.now().toString(),
      name: newStudentName,
      birthDate: newStudentBirth,
      classId: classId
    };

    db.addStudent(newStudent);
    loadStudents(classId);
    setNewStudentName('');
    setNewStudentBirth('');
  };

  const handleDeleteStudent = (studentId: string, studentName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o aluno "${studentName}"? Todas as avaliações associadas serão removidas.`)) {
      db.deleteStudent(studentId);
      if (classId) loadStudents(classId);
    }
  };

  const generateAllStudentsPDF = () => {
    if (!cls || students.length === 0) {
      alert('Não há alunos nesta turma para gerar relatórios.');
      return;
    }

    const doc = new jsPDF();
    const allEvals = db.getEvaluations();
    let hasData = false;

    students.forEach((student, studentIndex) => {
      const studentEvals = allEvals.filter(e => e.studentId === student.id && e.trimester === selectedTrimester);
      const ev = studentEvals[0]; // Get the evaluation for the selected trimester

      if (!ev) return; // Skip if no evaluation for this trimester
      
      hasData = true;

      if (studentIndex > 0 && hasData) {
        doc.addPage();
      }

      let currentY = 20;
      
      doc.setFontSize(16);
      doc.text(`Relatório Individual: ${student.name}`, 14, currentY);
      doc.setFontSize(12);
      doc.text(`Turma: ${cls.name}`, 14, currentY + 8);
      doc.text(`Data de Nascimento: ${new Date(student.birthDate).toLocaleDateString('pt-BR')}`, 14, currentY + 14);
      
      currentY += 25;
      
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
      }
    });

    if (!hasData) {
      alert(`Nenhum aluno desta turma possui avaliação registrada no ${selectedTrimester}º Trimestre.`);
      return;
    }

    doc.save(`relatorios_individuais_${cls.name.replace(/\s+/g, '_')}_tri${selectedTrimester}.pdf`);
  };

  const handleSendToCoordinator = () => {
    if (!cls || !user || students.length === 0) return;
    
    const allEvals = db.getEvaluations();
    const hasAnyEval = students.some(s => allEvals.some(e => e.studentId === s.id && e.trimester === selectedTrimester));
    
    if (!hasAnyEval) {
      alert(`Nenhum aluno desta turma possui avaliação registrada no ${selectedTrimester}º Trimestre.`);
      return;
    }

    // Generate PDF first
    generateAllStudentsPDF();

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
      content: `O professor ${user.name} enviou os relatórios individuais de todos os alunos da turma ${cls.name} referente ao ${selectedTrimester}º Trimestre.`,
      timestamp: new Date().toISOString(),
      read: false,
      link: `/class/${cls.id}`,
      linkText: 'Acessar Turma'
    });

    setIsCoordinatorModalOpen(false);
    alert('Relatórios enviados com sucesso para o coordenador!');
  };

  if (!cls) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="p-2 dark:hover:bg-slate-800 shrink-0">
              <ArrowLeft className="w-5 h-5 dark:text-slate-300" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{cls.name}</h1>
              <p className="text-slate-500 dark:text-slate-400">
                Ano: {cls.year} {cls.school ? `| Escola: ${cls.school}` : ''}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <Button variant="ghost" size="sm" onClick={toggleTheme} className="rounded-full w-10 h-10 p-0 shrink-0">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>
            <Button variant="outline" onClick={() => navigate(`/reports/${cls.id}`)} className="dark:border-slate-700 dark:text-slate-300">
              <FileBarChart className="w-4 h-4 mr-2" />
              Relatórios da Turma
            </Button>
            {user?.role === 'teacher' && (
              <Button onClick={() => setIsCoordinatorModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <FileText className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Gerar Relatórios Individuais</span>
                <span className="sm:hidden">Relatórios Indiv.</span>
              </Button>
            )}
          </div>
        </header>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm space-y-6 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-3 text-indigo-600 dark:text-indigo-400">
              <UserPlus className="w-6 h-6" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Novo Aluno</h2>
            </div>
            
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nome do Aluno</label>
                <Input 
                  value={newStudentName}
                  onChange={e => setNewStudentName(e.target.value)}
                  placeholder="Nome completo"
                  required
                  className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Data de Nascimento</label>
                <Input 
                  type="date"
                  value={newStudentBirth}
                  onChange={e => setNewStudentBirth(e.target.value)}
                  required
                  className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
              <Button type="submit" className="w-full">Cadastrar Aluno</Button>
            </form>
          </div>

          <div className="md:col-span-2 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm space-y-6 border border-slate-200 dark:border-slate-800 min-w-0">
            <div className="flex items-center space-x-3 text-emerald-600 dark:text-emerald-400">
              <Users className="w-6 h-6" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Alunos da Turma</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Nome</th>
                    <th className="py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 text-slate-900 dark:text-slate-200 font-medium">{student.name}</td>
                      <td className="py-3 px-4 text-center space-x-2 flex items-center justify-center">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => navigate(`/student/${classId}/${student.id}`)}
                          className="dark:border-slate-700 dark:text-slate-300"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Detalhes
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => navigate(`/evaluate/${classId}/${student.id}`)}
                          className="dark:border-slate-700 dark:text-slate-300"
                        >
                          <Activity className="w-4 h-4 mr-2" />
                          Avaliar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => handleDeleteStudent(student.id, student.name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-slate-500 dark:text-slate-400">
                        Nenhum aluno cadastrado nesta turma.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {isCoordinatorModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Gerar e Enviar Relatórios Individuais
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setIsCoordinatorModalOpen(false)} className="p-1 h-auto">
                <X className="w-5 h-5 text-slate-500" />
              </Button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Selecione o trimestre para gerar um PDF único contendo os relatórios individuais de todos os alunos avaliados.
            </p>
            <form onSubmit={confirmSendToCoordinator} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Trimestre
                </label>
                <select
                  value={selectedTrimester}
                  onChange={(e) => setSelectedTrimester(Number(e.target.value) as 1|2|3)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                  required
                >
                  <option value={1}>1º Trimestre</option>
                  <option value={2}>2º Trimestre</option>
                  <option value={3}>3º Trimestre</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Coordenador (para enviar notificação)
                </label>
                <select
                  value={selectedCoordinatorId}
                  onChange={(e) => setSelectedCoordinatorId(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                  required
                >
                  <option value="" disabled>Selecione um coordenador</option>
                  {coordinators.length === 0 && <option value="" disabled>Carregando coordenadores...</option>}
                  {coordinators.map(coord => (
                    <option key={coord.id} value={coord.id}>
                      {coord.name} ({coord.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button type="button" variant="outline" onClick={generateAllStudentsPDF} className="mr-auto dark:border-slate-700 dark:text-slate-300">
                  <FileText className="w-4 h-4 mr-2" />
                  Apenas Baixar PDF
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                  <Send className="w-4 h-4 mr-2" />
                  Baixar e Enviar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
