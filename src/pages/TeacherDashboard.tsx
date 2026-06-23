import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/db';
import { Class, Student, Message } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../lib/auth';
import { LogOut, PlusCircle, Users, ChevronRight, Upload, FileText, Trash2, Sun, Moon, MessageSquare, Edit2, X, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../lib/ThemeContext';
import { MessagePanel } from '../components/MessagePanel';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Configure PDF.js worker using Vite's ?url import
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [newClassName, setNewClassName] = useState('');
  const [newClassYear, setNewClassYear] = useState(new Date().getFullYear());
  const [newClassSchool, setNewClassSchool] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [editClassYear, setEditClassYear] = useState(new Date().getFullYear());
  const [editClassSchool, setEditClassSchool] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      if (user) {
        const msgs = await db.getMessages(user.id);
        setMessages(msgs);
        const allClasses = await db.getClasses();
        setClasses(allClasses.filter(c => c.teacherId === user.id));
      }
    };
    loadData();
  }, [user]);

  const loadMessages = async () => {
    if (user) {
      const msgs = await db.getMessages(user.id);
      setMessages(msgs);
    }
  };

  const handleMarkAsRead = async (msgId: string) => {
    await db.markMessageAsRead(msgId);
    await loadMessages();
  };

  const loadClasses = async () => {
    if (!user) return;
    const allClasses = await db.getClasses();
    setClasses(allClasses.filter(c => c.teacherId === user.id));
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName || !user) return;

    const newClass: Class = {
      id: Date.now().toString(),
      name: newClassName,
      year: newClassYear,
      teacherId: user.id,
      school: newClassSchool || undefined
    };

    await db.addClass(newClass);
    await loadClasses();
    setNewClassName('');
    setNewClassSchool('');
  };

  const handleDeleteClass = async (e: React.MouseEvent, classId: string, className: string) => {
    e.stopPropagation();
    if (window.confirm(`Tem certeza que deseja excluir a turma "${className}"? Todos os alunos e avaliações associados serão removidos.`)) {
      await db.deleteClass(classId);
      await loadClasses();
    }
  };

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + ' ';
      }

      // Extract Class Name
      const serieMatch = fullText.match(/S[ée]rie[^\w]*([A-Za-z0-9\s]+?)(?=\s+Turno|\s+Turma|$)/i);
      const turmaMatch = fullText.match(/Turma[^\w]*([A-Za-z0-9]+)/i);
      
      let className = 'Nova Turma Importada';
      if (serieMatch && turmaMatch) {
        className = `${serieMatch[1].trim()} - Turma ${turmaMatch[1].trim()}`;
      } else if (serieMatch) {
        className = serieMatch[1].trim();
      } else if (turmaMatch) {
        className = `Turma ${turmaMatch[1].trim()}`;
      }

      // Create the class
      const classId = Date.now().toString();
      const newClass: Class = {
        id: classId,
        name: className,
        year: new Date().getFullYear(),
        teacherId: user.id,
        school: user.schools?.[0] || undefined
      };
      await db.addClass(newClass);

      // Extract Students
      const studentRegex = /([A-ZÀ-Ÿa-zà-ÿ][A-ZÀ-Ÿa-zà-ÿ\s'\-]{4,})\s+(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/g;
      
      let match;
      let studentCount = 0;
      while ((match = studentRegex.exec(fullText)) !== null) {
        let name = match[1].trim();
        const dateStr = match[2];
        const [day, month, year] = dateStr.split(/[\/\-\.]/);
        
        name = name.replace(/^(MATRICULADO|SITUACAO|SITUAÇÃO|ATIVO|INATIVO|TRANSFERIDO|DESISTENTE|CURSANDO|APROVADO|REPROVADO|MASCULINO|FEMININO|SIM|NAO|NÃO)\s+/i, '').trim();
        
        const upperName = name.toUpperCase();
        if (['MATRICULADO', 'SITUACAO', 'SITUAÇÃO', 'ATIVO', 'TRANSFERIDO', 'DESISTENTE'].includes(upperName)) continue;
        
        if (name.length < 5) continue;

        const newStudent: Student = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          name: name,
          birthDate: `${year}-${month}-${day}`,
          classId: classId
        };
        await db.addStudent(newStudent);
        studentCount++;
      }

      // Fallback if no students were found with dates
      if (studentCount === 0) {
        const fallbackRegex = /(?:^|\s)(?:\d{1,3}[\.\-]?\s+)([A-ZÀ-Ÿa-zà-ÿ][A-ZÀ-Ÿa-zà-ÿ\s'\-]{5,})(?=\s+\d{1,3}[\.\-]?\s+|\s*$|\s+(?:MATRICULADO|SITUACAO|SITUAÇÃO|ATIVO|INATIVO|TRANSFERIDO|DESISTENTE|CURSANDO|APROVADO|REPROVADO))/gi;
        
        let fallbackMatch;
        while ((fallbackMatch = fallbackRegex.exec(fullText)) !== null) {
          let name = fallbackMatch[1].trim();
          name = name.replace(/^(MATRICULADO|SITUACAO|SITUAÇÃO|ATIVO|INATIVO|TRANSFERIDO|DESISTENTE|CURSANDO|APROVADO|REPROVADO|MASCULINO|FEMININO|SIM|NAO|NÃO)\s+/i, '').trim();
          
          if (name.length < 5) continue;
          
          const upperName = name.toUpperCase();
          if (['MATRICULADO', 'SITUACAO', 'SITUAÇÃO', 'ATIVO', 'TRANSFERIDO', 'DESISTENTE'].includes(upperName)) continue;

          const newStudent: Student = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            name: name,
            birthDate: `${new Date().getFullYear()}-01-01`, // Default date
            classId: classId
          };
          await db.addStudent(newStudent);
          studentCount++;
        }
      }

      await loadClasses();
      alert(`Turma "${className}" criada com sucesso! ${studentCount} alunos importados.`);
    } catch (error) {
      console.error("Error parsing PDF:", error);
      alert("Erro ao processar o arquivo PDF. Verifique se é um formato válido.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const unreadCount = messages.filter(m => !m.read).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Painel do Professor</h1>
            <p className="text-slate-500 dark:text-slate-400">Bem-vindo, {user?.name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <Button variant="ghost" size="sm" onClick={toggleTheme} className="rounded-full w-10 h-10 p-0 shrink-0">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>
            <div className="relative shrink-0">
              <Button variant="ghost" size="sm" onClick={() => document.getElementById('messages-section')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-full w-10 h-10 p-0">
                <MessageSquare className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </Button>
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <Button variant="outline" onClick={handleLogout} className="dark:border-slate-700 dark:text-slate-300 ml-auto sm:ml-0">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </header>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6 min-w-0">
            <MessagePanel 
              messages={messages} 
              currentUser={user!} 
              onMessageRead={loadMessages} 
            />

            <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm space-y-6 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-3 text-indigo-600 dark:text-indigo-400">
                <PlusCircle className="w-6 h-6" />
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Nova Turma</h2>
              </div>
              
              <form onSubmit={handleAddClass} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nome da Turma</label>
                  <Input 
                    value={newClassName}
                    onChange={e => setNewClassName(e.target.value)}
                    placeholder="Ex: Turma A - Manhã"
                    required
                    className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Ano</label>
                  <Input 
                    type="number"
                    value={newClassYear}
                    onChange={e => setNewClassYear(Number(e.target.value))}
                    required
                    className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Escola</label>
                  <Input 
                    list="schools-list"
                    value={newClassSchool}
                    onChange={e => setNewClassSchool(e.target.value)}
                    placeholder="Nome da escola"
                    className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                  {user?.schools && user.schools.length > 0 && (
                    <datalist id="schools-list">
                      {user.schools.map(s => <option key={s} value={s} />)}
                    </datalist>
                  )}
                </div>
                <Button type="submit" className="w-full">Cadastrar Turma</Button>
              </form>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm space-y-4 border-2 border-dashed border-indigo-100 dark:border-indigo-900/30">
              <div className="flex items-center space-x-3 text-indigo-600 dark:text-indigo-400">
                <FileText className="w-6 h-6" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Importar Relação</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Faça upload do PDF da relação nominal para criar a turma e importar os alunos automaticamente.
              </p>
              
              <input 
                type="file" 
                accept=".pdf" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <Button 
                variant="outline" 
                className="w-full border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? 'Processando...' : 'Selecionar PDF'}
              </Button>
            </div>
          </div>

          <div className="md:col-span-2 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm space-y-6 border border-slate-200 dark:border-slate-800 min-w-0">
            <div className="flex items-center space-x-3 text-emerald-600 dark:text-emerald-400">
              <Users className="w-6 h-6" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Minhas Turmas</h2>
            </div>

            <div className="grid gap-4">
              {classes.map(cls => (
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
                          {user?.schools && user.schools.length > 0 && (
                            <datalist id="edit-schools-list">
                              {user.schools.map(s => <option key={s} value={s} />)}
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
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Ano: {cls.year} {cls.school ? `| Escola: ${cls.school}` : ''}
                        </p>
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
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={(e) => handleDeleteClass(e, cls.id, cls.name)}
                          title="Excluir Turma"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-full text-indigo-600 dark:text-indigo-400 ml-2">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {classes.length === 0 && (
                <div className="py-8 text-center text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  Nenhuma turma cadastrada.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

