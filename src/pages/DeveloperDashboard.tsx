import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { User, Message } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../lib/auth';
import { LogOut, UserPlus, Users, Sun, Moon, Edit2, Trash2, X, Save, FileBarChart, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../lib/ThemeContext';
import { MessagePanel } from '../components/MessagePanel';

export default function DeveloperDashboard() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [coordinators, setCoordinators] = useState<User[]>([]);
  const [newCoordName, setNewCoordName] = useState('');
  const [newCoordEmail, setNewCoordEmail] = useState('');
  const [newCoordPassword, setNewCoordPassword] = useState('');
  const [editingCoord, setEditingCoord] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    loadCoordinators();
    loadMessages();
  }, [user]);

  const loadMessages = () => {
    if (user) {
      setMessages(db.getMessages(user.id));
    }
  };

  const handleMarkAsRead = (msgId: string) => {
    db.markMessageAsRead(msgId);
    loadMessages();
  };

  const loadCoordinators = () => {
    const allUsers = db.getUsers();
    setCoordinators(allUsers.filter(u => u.role === 'coordinator'));
  };

  const handleAddCoordinator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoordName || !newCoordEmail || !newCoordPassword) return;

    const newCoordinator: User = {
      id: Date.now().toString(),
      name: newCoordName,
      email: newCoordEmail,
      password: newCoordPassword,
      role: 'coordinator'
    };

    db.addUser(newCoordinator);
    loadCoordinators();
    setNewCoordName('');
    setNewCoordEmail('');
    setNewCoordPassword('');
  };

  const handleEditCoordinator = (coord: User) => {
    setEditingCoord(coord);
  };

  const handleUpdateCoordinator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoord) return;
    
    db.updateUser(editingCoord);
    loadCoordinators();
    setEditingCoord(null);
  };

  const handleDeleteCoordinator = (coordId: string, coordName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o coordenador "${coordName}"?`)) {
      db.deleteUser(coordId);
      loadCoordinators();
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const unreadCount = messages.filter(m => !m.read).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Painel do Desenvolvedor</h1>
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
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Novo Coordenador</h2>
              </div>
              
              <form onSubmit={handleAddCoordinator} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nome</label>
                  <Input 
                    value={newCoordName}
                    onChange={e => setNewCoordName(e.target.value)}
                    placeholder="Nome do coordenador"
                    required
                    className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                  <Input 
                    type="email"
                    value={newCoordEmail}
                    onChange={e => setNewCoordEmail(e.target.value)}
                    placeholder="email@escola.com"
                    required
                    className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Senha</label>
                  <Input 
                    type="password"
                    value={newCoordPassword}
                    onChange={e => setNewCoordPassword(e.target.value)}
                    placeholder="Senha inicial"
                    required
                    className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
                <Button type="submit" className="w-full">Cadastrar Coordenador</Button>
              </form>
            </div>
          </div>

          <div className="md:col-span-2 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm space-y-6 border border-slate-200 dark:border-slate-800 min-w-0">
            <div className="flex items-center space-x-3 text-emerald-600 dark:text-emerald-400">
              <Users className="w-6 h-6" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Coordenadores Cadastrados</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Nome</th>
                    <th className="py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Email</th>
                    <th className="py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {coordinators.map(coord => (
                    <tr key={coord.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      {editingCoord?.id === coord.id ? (
                        <td colSpan={3} className="py-3 px-4">
                          <form onSubmit={handleUpdateCoordinator} className="flex items-center space-x-2">
                            <Input 
                              value={editingCoord.name}
                              onChange={e => setEditingCoord({...editingCoord, name: e.target.value})}
                              className="h-8 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                              required
                              placeholder="Nome"
                            />
                            <Input 
                              type="email"
                              value={editingCoord.email}
                              onChange={e => setEditingCoord({...editingCoord, email: e.target.value})}
                              className="h-8 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                              required
                              placeholder="Email"
                            />
                            <Input 
                              type="text"
                              value={editingCoord.password || ''}
                              onChange={e => setEditingCoord({...editingCoord, password: e.target.value})}
                              placeholder="Nova senha"
                              className="h-8 dark:bg-slate-800 dark:border-slate-700 dark:text-white w-24"
                            />
                            <Button type="submit" size="sm" variant="outline" className="h-8 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400">
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setEditingCoord(null)} className="h-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                              <X className="w-4 h-4" />
                            </Button>
                          </form>
                        </td>
                      ) : (
                        <>
                          <td className="py-3 px-4 text-slate-900 dark:text-slate-200 font-medium">{coord.name}</td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{coord.email}</td>
                          <td className="py-3 px-4 text-center space-x-2">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleEditCoordinator(coord)}
                              className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleDeleteCoordinator(coord.id, coord.name)}
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
                  {coordinators.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-500 dark:text-slate-400">
                        Nenhum coordenador cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
