import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { User, Message } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../lib/auth';
import { LogOut, UserPlus, Users, Sun, Moon, Edit2, Trash2, X, Save, FileBarChart, MessageSquare, Database, RefreshCw, CheckCircle, TrendingUp, School, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../lib/ThemeContext';
import { MessagePanel } from '../components/MessagePanel';

import { secondaryAuth, db as firestore } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { writeBatch, doc } from 'firebase/firestore';

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
  
  const [isSeeding, setIsSeeding] = useState(false);
  const [counts, setCounts] = useState({
    users: 0,
    classes: 0,
    students: 0,
    evaluations: 0,
    messages: 0
  });

  const loadCounts = async () => {
    try {
      const allUsers = await db.getUsers();
      const allClasses = await db.getClasses();
      const allStudents = await db.getStudents();
      const allEvals = await db.getEvaluations();
      const userMsgs = user ? await db.getMessages(user.id) : [];
      
      setCounts({
        users: allUsers.length,
        classes: allClasses.length,
        students: allStudents.length,
        evaluations: allEvals.length,
        messages: userMsgs.length
      });
    } catch (error) {
      console.error("Erro ao carregar contadores do Firestore:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (user) {
        const msgs = await db.getMessages(user.id);
        setMessages(msgs);
        const allUsers = await db.getUsers();
        setCoordinators(allUsers.filter(u => u.role === 'coordinator'));
        await loadCounts();
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
    await loadCounts();
  };

  const loadCoordinators = async () => {
    const allUsers = await db.getUsers();
    setCoordinators(allUsers.filter(u => u.role === 'coordinator'));
    await loadCounts();
  };

  const handleRecreateDB = async () => {
    if (!window.confirm("⚠️ Tem certeza que deseja RECRIAR o banco de dados?\n\nIsso irá apagar todas as turmas, alunos e avaliações atuais e gerar dados de teste limpos de Cianorte para você testar todas as funcionalidades do sistema.")) {
      return;
    }

    setIsSeeding(true);
    try {
      const batch = writeBatch(firestore);

      // 1. Fetch current items to clear them
      const allClasses = await db.getClasses();
      const allStudents = await db.getStudents();
      const allEvals = await db.getEvaluations();

      // 2. Add delete operations to batch
      allClasses.forEach(c => {
        batch.delete(doc(firestore, 'classes', c.id));
      });
      allStudents.forEach(s => {
        batch.delete(doc(firestore, 'students', s.id));
      });
      allEvals.forEach(ev => {
        batch.delete(doc(firestore, 'evaluations', ev.id));
      });

      await batch.commit();

      const writeBatch2 = writeBatch(firestore);
      
      // 3. Seed Users
      const seedCoordinators = [
        { id: 'test_admin_uid', name: 'Marta Coordenadora', email: 'admin@escola.com', role: 'coordinator' }
      ];
      const seedTeachers = [
        { id: 'test_joao_uid', name: 'João Professor', email: 'joao@escola.com', role: 'teacher' }
      ];

      for (const u of [...seedCoordinators, ...seedTeachers]) {
        writeBatch2.set(doc(firestore, 'users', u.id), u, { merge: true });
      }

      // Preserve current user
      if (user) {
        writeBatch2.set(doc(firestore, 'users', user.id), {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }, { merge: true });
      }

      // 4. Seed Classes
      const classesToSeed = [
        { id: 'class_1_1ano_a', name: '1º Ano A - Vespertino', teacherId: 'test_joao_uid', year: 2026, school: 'Escola Municipal Gonçalo Moreno' },
        { id: 'class_2_2ano_b', name: '2º Ano B - Matutino', teacherId: 'test_joao_uid', year: 2026, school: 'Escola Municipal Rainha da Paz' },
        { id: 'class_3_5ano_a', name: '5º Ano A - Vespertino', teacherId: 'test_joao_uid', year: 2026, school: 'Escola Municipal Gonçalo Moreno' }
      ];

      // If current user wants to test, let's also duplicate classes for their ID so they can test the Teacher Dashboard directly!
      if (user) {
        classesToSeed.push(
          { id: `class_active_1`, name: '1º Ano A (Sua Conta Teste)', teacherId: user.id, year: 2026, school: 'Escola Municipal Gonçalo Moreno' },
          { id: `class_active_2`, name: '2º Ano B (Sua Conta Teste)', teacherId: user.id, year: 2026, school: 'Escola Municipal Rainha da Paz' }
        );
      }

      classesToSeed.forEach(c => {
        writeBatch2.set(doc(firestore, 'classes', c.id), c);
      });

      // 5. Seed Students
      const studentsToSeed = [
        // Class 1 (João)
        { id: 'st_1', name: 'Arthur Silva Mendonça', classId: 'class_1_1ano_a', birthDate: '2019-04-12' },
        { id: 'st_2', name: 'Beatriz Ramos de Castro', classId: 'class_1_1ano_a', birthDate: '2019-08-22' },
        { id: 'st_3', name: 'Caio Vinícius Oliveira', classId: 'class_1_1ano_a', birthDate: '2019-01-05' },
        { id: 'st_4', name: 'Davi Miguel Ferreira', classId: 'class_1_1ano_a', birthDate: '2019-11-14' },
        { id: 'st_5', name: 'Eloá Cristina Santos', classId: 'class_1_1ano_a', birthDate: '2019-06-30' },

        // Class 2 (João)
        { id: 'st_6', name: 'Gabriel Henrique Lima', classId: 'class_2_2ano_b', birthDate: '2018-03-15' },
        { id: 'st_7', name: 'Helena Vitória Gomes', classId: 'class_2_2ano_b', birthDate: '2018-05-20' },
        { id: 'st_8', name: 'Isabella Rodrigues', classId: 'class_2_2ano_b', birthDate: '2018-09-11' },
        { id: 'st_9', name: 'João Pedro Barbosa', classId: 'class_2_2ano_b', birthDate: '2018-12-01' },
        { id: 'st_10', name: 'Laura Sophia Melo', classId: 'class_2_2ano_b', birthDate: '2018-07-29' },

        // Class 3 (João)
        { id: 'st_11', name: 'Matheus Felipe Costa', classId: 'class_3_5ano_a', birthDate: '2015-02-18' },
        { id: 'st_12', name: 'Nicole Souza Rocha', classId: 'class_3_5ano_a', birthDate: '2015-10-22' },
        { id: 'st_13', name: 'Otávio Augusto Alves', classId: 'class_3_5ano_a', birthDate: '2015-06-03' }
      ];

      if (user) {
        studentsToSeed.push(
          { id: 'st_act_1', name: 'Clara Maria Ribeiro', classId: 'class_active_1', birthDate: '2019-03-14' },
          { id: 'st_act_2', name: 'Felipe Neto Guimarães', classId: 'class_active_1', birthDate: '2019-07-25' },
          { id: 'st_act_3', name: 'Vitória Cecília Luz', classId: 'class_active_1', birthDate: '2019-10-09' },
          { id: 'st_act_4', name: 'Murilo Henrique Dias', classId: 'class_active_2', birthDate: '2018-04-22' },
          { id: 'st_act_5', name: 'Alice Ramos Freitas', classId: 'class_active_2', birthDate: '2018-08-30' }
        );
      }

      studentsToSeed.forEach(s => {
        writeBatch2.set(doc(firestore, 'students', s.id), s);
      });

      // 6. Seed Evaluations
      const evalsToSeed: any[] = [];
      const trimesters = [1, 2] as const;

      studentsToSeed.forEach((student) => {
        trimesters.forEach((trimester) => {
          const items: any[] = [];
          for (let i = 1; i <= 40; i++) {
            let level: 'BEM' | 'DIFICULDADE' | 'NAO_EXECUTA' = 'BEM';
            
            if (trimester === 1) {
              if (i % 7 === 0) level = 'NAO_EXECUTA';
              else if (i % 4 === 0) level = 'DIFICULDADE';
            } else {
              if (i % 12 === 0) level = 'DIFICULDADE';
            }

            items.push({ itemId: i, level });
          }

          evalsToSeed.push({
            id: `eval_${student.id}_t${trimester}`,
            studentId: student.id,
            classId: student.classId,
            teacherId: student.classId.startsWith('class_active_') ? user?.id : 'test_joao_uid',
            trimester,
            date: trimester === 1 ? '2026-04-10' : '2026-08-15',
            items,
            notes: `Desenvolvimento ${trimester === 1 ? 'inicial' : 'com excelente evolução'} observado nas aulas de Educação Física de Cianorte.`
          });
        });
      });

      evalsToSeed.forEach(ev => {
        writeBatch2.set(doc(firestore, 'evaluations', ev.id), ev);
      });

      // 7. Seed Messages
      const messagesToSeed = [
        {
          id: 'msg_1',
          senderId: 'test_admin_uid',
          receiverId: 'test_joao_uid',
          content: 'Olá Professor João! Excelente trabalho com o plano de aulas corporais. Lembre-se de fechar as avaliações no SADP.',
          timestamp: new Date().toISOString(),
          read: false
        },
        {
          id: 'msg_2',
          senderId: 'test_admin_uid',
          receiverId: user?.id || 'test_joao_uid',
          content: 'Olá! Configuramos suas turmas de Educação Física para Cianorte. Todo o banco de dados de teste foi recriado com sucesso!',
          timestamp: new Date().toISOString(),
          read: false
        }
      ];

      messagesToSeed.forEach(m => {
        writeBatch2.set(doc(firestore, 'messages', m.id), m);
      });

      await writeBatch2.commit();

      await loadCoordinators();
      await loadCounts();
      alert('🎉 Banco de dados recriado com sucesso!\n\nForam gerados:\n- 3 Contas padrão (Admin, Professor João e Dev)\n- 5 Turmas de Educação Física\n- 18 Alunos com avaliações para o 1º e 2º trimestres.\n\nSua conta desenvolvedor foi mantida.');
    } catch (error: any) {
      console.error("Erro recriando BD:", error);
      alert('Erro ao recriar banco de dados: ' + error.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleAddCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoordName || !newCoordEmail || !newCoordPassword) return;

    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, newCoordEmail, newCoordPassword);
      
      const newCoordinator: User = {
        id: cred.user.uid,
        name: newCoordName,
        email: newCoordEmail,
        role: 'coordinator'
      };

      await db.addUser(newCoordinator);
      await secondaryAuth.signOut();
      
      await loadCoordinators();
      setNewCoordName('');
      setNewCoordEmail('');
      setNewCoordPassword('');
      alert('Coordenador cadastrado com sucesso!');
    } catch (error: any) {
      console.error(error);
      alert('Erro ao cadastrar coordenador: ' + error.message);
    }
  };

  const handleEditCoordinator = (coord: User) => {
    setEditingCoord(coord);
  };

  const handleUpdateCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoord) return;
    
    await db.updateUser(editingCoord);
    await loadCoordinators();
    setEditingCoord(null);
  };

  const handleDeleteCoordinator = async (coordId: string, coordName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o coordenador "${coordName}"?`)) {
      await db.deleteUser(coordId);
      await loadCoordinators();
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

        {/* Bento Grid de Estatísticas em Tempo Real */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Usuários</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{counts.users}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <School className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Turmas</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{counts.classes}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Alunos</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{counts.students}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Avaliações</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{counts.evaluations}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center space-x-3 col-span-2 md:col-span-1">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-lg">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Minhas Msg</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{counts.messages}</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6 min-w-0">
            {/* Bloco de Gerenciamento do Banco de Dados */}
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm space-y-4 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
                <Database className="w-6 h-6" />
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Gerenciar Banco</h2>
              </div>
              
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Use esta ferramenta para redefinir o banco de dados do Firestore. Isso limpará dados antigos de turmas, alunos e cadastrará dados limpos e integrados de Educação Física de Cianorte para testar todas as seções e relatórios do app de forma imediata.
              </p>

              <Button
                onClick={handleRecreateDB}
                disabled={isSeeding}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {isSeeding ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Gerando dados...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    🔴 Recriar e Semear BD
                  </>
                )}
              </Button>
            </div>

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
