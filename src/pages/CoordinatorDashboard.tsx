import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { User, Message } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../lib/auth';
import { LogOut, UserPlus, Users, Sun, Moon, Edit2, Trash2, X, Save, MessageSquare, FileBarChart, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../lib/ThemeContext';
import { MessagePanel } from '../components/MessagePanel';

import { secondaryAuth } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';

export default function CoordinatorDashboard() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<User[]>([]);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherPassword, setNewTeacherPassword] = useState('');
  const [newTeacherSchools, setNewTeacherSchools] = useState('');
  const [editingTeacher, setEditingTeacher] = useState<User | null>(null);
  const [editingTeacherSchools, setEditingTeacherSchools] = useState('');
  const [editingTeacherNotes, setEditingTeacherNotes] = useState('');
  const [messagingTeacher, setMessagingTeacher] = useState<User | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (user) {
        const msgs = await db.getMessages(user.id);
        setMessages(msgs);
        const allUsers = await db.getUsers();
        setTeachers(allUsers.filter(u => u.role === 'teacher'));
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

  const loadTeachers = async () => {
    const allUsers = await db.getUsers();
    setTeachers(allUsers.filter(u => u.role === 'teacher'));
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName || !newTeacherEmail || !newTeacherPassword) return;

    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, newTeacherEmail, newTeacherPassword);
      const schoolsArray = newTeacherSchools.split(',').map(s => s.trim()).filter(s => s !== '');

      const newTeacher: User = {
        id: cred.user.uid,
        name: newTeacherName,
        email: newTeacherEmail,
        role: 'teacher',
        schools: schoolsArray.length > 0 ? schoolsArray : undefined
      };

      await db.addUser(newTeacher);
      await secondaryAuth.signOut();
      
      await loadTeachers();
      setNewTeacherName('');
      setNewTeacherEmail('');
      setNewTeacherPassword('');
      setNewTeacherSchools('');
      alert('Professor cadastrado com sucesso!');
    } catch (error: any) {
      console.error(error);
      alert('Erro ao cadastrar professor: ' + error.message);
    }
  };

  const handleEditTeacher = (teacher: User) => {
    setEditingTeacher(teacher);
    setEditingTeacherSchools(teacher.schools?.join(', ') || '');
    setEditingTeacherNotes(teacher.notes || '');
  };

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    
    const schoolsArray = editingTeacherSchools.split(',').map(s => s.trim()).filter(s => s !== '');
    const updatedTeacher = {
      ...editingTeacher,
      schools: schoolsArray.length > 0 ? schoolsArray : undefined,
      notes: editingTeacherNotes
    };
    
    await db.updateUser(updatedTeacher);
    await loadTeachers();
    setEditingTeacher(null);
    setEditingTeacherSchools('');
    setEditingTeacherNotes('');
  };

  const handleDeleteTeacher = async (teacherId: string, teacherName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o professor "${teacherName}"?`)) {
      await db.deleteUser(teacherId);
      await loadTeachers();
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messagingTeacher || !messageContent.trim() || !user) return;

    await db.addMessage({
      id: Date.now().toString(),
      senderId: user.id,
      receiverId: messagingTeacher.id,
      content: messageContent,
      timestamp: new Date().toISOString(),
      read: false
    });

    setMessagingTeacher(null);
    setMessageContent('');
    alert('Mensagem enviada com sucesso!');
  };

  const unreadCount = messages.filter(m => !m.read).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Painel do Coordenador</h1>
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
            <Button variant="outline" onClick={() => navigate('/reports')} className="dark:border-slate-700 dark:text-slate-300">
              <FileBarChart className="w-4 h-4 mr-2" />
              Relatórios
            </Button>
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
              <UserPlus className="w-6 h-6" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Novo Professor</h2>
            </div>
            
            <form onSubmit={handleAddTeacher} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nome</label>
                <Input 
                  value={newTeacherName}
                  onChange={e => setNewTeacherName(e.target.value)}
                  placeholder="Nome do professor"
                  required
                  className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                <Input 
                  type="email"
                  value={newTeacherEmail}
                  onChange={e => setNewTeacherEmail(e.target.value)}
                  placeholder="email@escola.com"
                  required
                  className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Senha</label>
                <Input 
                  type="password"
                  value={newTeacherPassword}
                  onChange={e => setNewTeacherPassword(e.target.value)}
                  placeholder="Senha inicial"
                  required
                  className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Escolas (separadas por vírgula)</label>
                <Input 
                  type="text"
                  value={newTeacherSchools}
                  onChange={e => setNewTeacherSchools(e.target.value)}
                  placeholder="Ex: Escola A, Escola B"
                  className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
              <Button type="submit" className="w-full">Cadastrar Professor</Button>
            </form>
          </div>
          </div>

          <div className="md:col-span-2 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm space-y-6 border border-slate-200 dark:border-slate-800 min-w-0">
            <div className="flex items-center space-x-3 text-emerald-600 dark:text-emerald-400">
              <Users className="w-6 h-6" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Professores Cadastrados</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Nome</th>
                    <th className="py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Email</th>
                    <th className="py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Escolas</th>
                    <th className="py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Notas</th>
                    <th className="py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map(teacher => (
                    <tr key={teacher.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      {editingTeacher?.id === teacher.id ? (
                        <td colSpan={5} className="py-3 px-4">
                          <form onSubmit={handleUpdateTeacher} className="flex items-center space-x-2">
                            <Input 
                              value={editingTeacher.name}
                              onChange={e => setEditingTeacher({...editingTeacher, name: e.target.value})}
                              className="h-8 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                              required
                              placeholder="Nome"
                            />
                            <Input 
                              type="email"
                              value={editingTeacher.email}
                              onChange={e => setEditingTeacher({...editingTeacher, email: e.target.value})}
                              className="h-8 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                              required
                              placeholder="Email"
                            />
                            <Input 
                              type="text"
                              value={editingTeacherSchools}
                              onChange={e => setEditingTeacherSchools(e.target.value)}
                              className="h-8 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                              placeholder="Escolas (vírgula)"
                            />
                            <Input 
                              type="text"
                              value={editingTeacherNotes}
                              onChange={e => setEditingTeacherNotes(e.target.value)}
                              className="h-8 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                              placeholder="Notas"
                            />
                            <Input 
                              type="text"
                              value={editingTeacher.password || ''}
                              onChange={e => setEditingTeacher({...editingTeacher, password: e.target.value})}
                              placeholder="Nova senha"
                              className="h-8 dark:bg-slate-800 dark:border-slate-700 dark:text-white w-24"
                            />
                            <Button type="submit" size="sm" variant="outline" className="h-8 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400">
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setEditingTeacher(null)} className="h-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                              <X className="w-4 h-4" />
                            </Button>
                          </form>
                        </td>
                      ) : (
                        <>
                          <td className="py-3 px-4 text-slate-900 dark:text-slate-200 font-medium">{teacher.name}</td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{teacher.email}</td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                            {teacher.schools && teacher.schools.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {teacher.schools.map((school, i) => (
                                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                                    {school}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-xs">Não informada</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                            {teacher.notes ? (
                              <span className="text-sm">{teacher.notes}</span>
                            ) : (
                              <span className="text-slate-400 italic text-xs">Sem notas</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center space-x-2">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => navigate(`/turmas/${teacher.id}`)}
                              className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              title="Ver Turmas"
                            >
                              <BookOpen className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => setMessagingTeacher(teacher)}
                              className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                              title="Enviar Mensagem"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleEditTeacher(teacher)}
                              className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                              className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {teachers.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-slate-500 dark:text-slate-400">
                        Nenhum professor cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {messagingTeacher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Mensagem para {messagingTeacher.name}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setMessagingTeacher(null)} className="p-1 h-auto">
                <X className="w-5 h-5 text-slate-500" />
              </Button>
            </div>
            <form onSubmit={handleSendMessage} className="space-y-4">
              <textarea
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm transition-colors placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-400 min-h-[120px]"
                placeholder="Digite sua mensagem aqui..."
                value={messageContent}
                onChange={e => setMessageContent(e.target.value)}
                required
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="ghost" onClick={() => setMessagingTeacher(null)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                  Enviar Mensagem
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
