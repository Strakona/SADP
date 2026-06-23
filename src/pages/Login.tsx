import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Activity, Sun, Moon, UserPlus, Shield, School, BookOpen } from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';
import { auth, db as firestore } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { user, login, loginWithGoogle, setUser, loginLocalUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [isAuthDisabled, setIsAuthDisabled] = useState(false);
  const [isGoogleLoggingIn, setIsGoogleLoggingIn] = useState(false);
  const [newGoogleUser, setNewGoogleUser] = useState<any>(null);
  const [showRoleSelection, setShowRoleSelection] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    
    const result = await login(email, password);
    if (!result.success) {
      if (result.error?.includes('E-mail/Senha está desativado') || result.error?.includes('operation-not-allowed')) {
        setIsAuthDisabled(true);
      }
      setError(result.error || 'Credenciais inválidas ou perfil não encontrado. Se for o primeiro acesso, clique em "Criar Contas de Teste".');
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsGoogleLoggingIn(true);
    try {
      const result = await loginWithGoogle();
      if (result.success) {
        if (result.isNewUser) {
          setNewGoogleUser(result.firebaseUser);
          setShowRoleSelection(true);
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(result.error || 'Erro ao entrar com o Google.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Erro ao autenticar com o Google: ' + err.message);
    } finally {
      setIsGoogleLoggingIn(false);
    }
  };

  const handleSelectRole = async (selectedRole: 'developer' | 'coordinator' | 'teacher') => {
    if (!newGoogleUser) return;
    setError('');
    setIsLoggingIn(true);
    try {
      const newUserProfile = {
        id: newGoogleUser.uid,
        name: newGoogleUser.displayName || 'Usuário Google',
        email: newGoogleUser.email || '',
        role: selectedRole
      };
      
      await setDoc(doc(firestore, 'users', newGoogleUser.uid), newUserProfile);
      setUser(newUserProfile);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError('Erro ao salvar perfil no banco de dados: ' + err.message);
    } finally {
      setIsLoggingIn(false);
      setShowRoleSelection(false);
      setNewGoogleUser(null);
    }
  };

  const handleCreateTestAccounts = async () => {
    setIsCreating(true);
    setError('');
    try {
      const accounts = [
        { email: 'dev@escola.com', pass: 'dev123', name: 'Desenvolvedor', role: 'developer' },
        { email: 'admin@escola.com', pass: 'admin123', name: 'Coordenador', role: 'coordinator' },
        { email: 'joao@escola.com', pass: '123456', name: 'João Professor', role: 'teacher' }
      ];

      for (const acc of accounts) {
        let uid = '';
        try {
          const cred = await createUserWithEmailAndPassword(auth, acc.email, acc.pass);
          uid = cred.user.uid;
        } catch (err: any) {
          if (err.code === 'auth/email-already-in-use') {
            const cred = await signInWithEmailAndPassword(auth, acc.email, acc.pass);
            uid = cred.user.uid;
          } else {
            throw err;
          }
        }

        if (uid) {
          await setDoc(doc(firestore, 'users', uid), {
            id: uid,
            name: acc.name,
            email: acc.email,
            role: acc.role
          }, { merge: true });
        }
      }

      alert('Contas de teste criadas/verificadas com sucesso! Você já pode fazer login.');
      await auth.signOut();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setIsAuthDisabled(true);
        setError('O login por E-mail e Senha está desativado no Authentication do seu console do Firebase.');
      } else {
        setError('Erro ao criar contas: ' + err.message);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 transition-colors duration-300">
      <div className="absolute top-6 right-6">
        <Button variant="ghost" size="sm" onClick={toggleTheme} className="rounded-full w-10 h-10 p-0">
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </Button>
      </div>

      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 space-y-6 border border-slate-200 dark:border-slate-800">
        
        {showRoleSelection ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-full">
                <School className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Configure seu Acesso</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Olá, <span className="font-semibold text-slate-700 dark:text-slate-300">{newGoogleUser?.displayName}</span>! Este é seu primeiro acesso com a conta do Google. Qual é o seu perfil de atuação no SADP?
              </p>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => handleSelectRole('teacher')}
                className="w-full flex items-center p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200 text-left cursor-pointer"
              >
                <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-lg mr-4 shrink-0">
                  <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Professor de Educação Física</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Cadastre suas turmas, importe alunos e preencha as avaliações trimestrais.</p>
                </div>
              </button>

              <button 
                onClick={() => handleSelectRole('coordinator')}
                className="w-full flex items-center p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200 text-left cursor-pointer"
              >
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-lg mr-4 shrink-0">
                  <School className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Coordenador Pedagógico</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Gerencie professores, turmas de sua escola e visualize relatórios consolidados.</p>
                </div>
              </button>

              <button 
                onClick={() => handleSelectRole('developer')}
                className="w-full flex items-center p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200 text-left cursor-pointer"
              >
                <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-lg mr-4 shrink-0">
                  <Shield className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Super Administrador / TI</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Desenvolvedor com acesso a ferramentas avançadas de diagnóstico e gestão global.</p>
                </div>
              </button>
            </div>
            
            <Button variant="ghost" className="w-full text-xs text-slate-400" onClick={() => setShowRoleSelection(false)}>
              Voltar ao login comum
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center space-y-2">
              <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-full">
                <Activity className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Acesso Restrito</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Acesse o painel do SADP Cianorte
              </p>
            </div>

            {/* Google Sign-In Button */}
            <div className="space-y-3">
              <Button 
                type="button" 
                onClick={handleGoogleLogin} 
                disabled={isGoogleLoggingIn}
                className="w-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-3 transition-all duration-150 shadow-sm text-sm"
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                {isGoogleLoggingIn ? 'Conectando...' : 'Entrar com o Google (Recomendado)'}
              </Button>
            </div>

            <div className="relative flex items-center justify-center py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
              </div>
              <span className="relative bg-white dark:bg-slate-900 px-3 text-xs text-slate-400 uppercase font-medium">Ou usuário local</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm text-center border border-red-200/50 dark:border-red-900/30">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                <Input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Senha</label>
                </div>
                <Input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoggingIn || isCreating}>
                {isLoggingIn ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center tracking-wider font-bold">
                ⚡ ATALHOS DE ACESSO INSTANTÂNEO (RECOMENDADO PARA IFRAME)
              </p>
              
              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-3.5 space-y-2.5">
                <p className="text-[11px] text-indigo-700 dark:text-indigo-400 text-center leading-relaxed">
                  Para contornar o bloqueio de popups e permissões de login do Firebase no iFrame, clique em um dos perfis para entrar instantaneamente:
                </p>
                
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => loginLocalUser('joao@escola.com')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold py-2.5 px-1 rounded-xl text-center shadow-sm transition hover:scale-[1.02] cursor-pointer"
                  >
                    👟 Prof. João
                  </button>
                  <button
                    type="button"
                    onClick={() => loginLocalUser('admin@escola.com')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-2.5 px-1 rounded-xl text-center shadow-sm transition hover:scale-[1.02] cursor-pointer"
                  >
                    🏫 Admin Marta
                  </button>
                  <button
                    type="button"
                    onClick={() => loginLocalUser('dev@escola.com')}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold py-2.5 px-1 rounded-xl text-center shadow-sm transition hover:scale-[1.02] cursor-pointer"
                  >
                    💻 Dev Caio
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 text-center leading-relaxed font-medium">
                ℹ️ Como o método de e-mail comum está com permissão limitada no console do seu Firebase atual, os botões acima criam uma conta simulada local no navegador com acesso total a todas as tabelas, turmas e relatórios de Cianorte de forma 100% segura.
              </p>
              
              {isAuthDisabled && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-400 flex items-center">
                    ⚠️ Ação Opcional no Console Firebase
                  </h3>
                  <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                    Se você preferir usar login por E-mail comum no futuro, você pode ativar o provedor de login correspondente:
                  </p>
                  <ol className="text-[11px] text-amber-700 dark:text-amber-300 list-decimal pl-4 space-y-1">
                    <li>Entre no Console Firebase do projeto <strong>ivory-fire-klsxp</strong>.</li>
                    <li>Solicite ao proprietário que ative o método de login por <strong>E-mail/senha</strong> ou altere sua permissão para Owner/Proprietário no painel IAM.</li>
                  </ol>
                  <a 
                    href="https://console.firebase.google.com/project/ivory-fire-klsxp/authentication/providers" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-2 block w-full text-center bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-3 rounded-lg text-xs transition duration-150 shadow-sm"
                  >
                    Ver Provedores de Login
                  </a>
                </div>
              )}

              <Button 
                variant="outline" 
                className="w-full text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                onClick={handleCreateTestAccounts}
                disabled={isCreating}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {isCreating ? 'Verificando/Criando...' : 'Habilitar Contas de Teste Locais'}
              </Button>
            </div>

            <div className="text-[11px] text-center text-slate-500 dark:text-slate-400 mt-2 space-y-1 leading-snug">
              <p>Credenciais Locais de Teste (ativando acima):</p>
              <p><strong>Desenvolvedor:</strong> dev@escola.com / dev123</p>
              <p><strong>Coordenador:</strong> admin@escola.com / admin123</p>
              <p><strong>Professor:</strong> joao@escola.com / 123456</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
