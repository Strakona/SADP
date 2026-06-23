import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface LoginResult {
  success: boolean;
  error?: string;
  isNewUser?: boolean;
  firebaseUser?: FirebaseUser;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<LoginResult>;
  loginWithGoogle: () => Promise<LoginResult>;
  logout: () => Promise<void>;
  loading: boolean;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isLocalMode: boolean;
  setLocalMode: (enabled: boolean) => void;
  loginLocalUser: (email: string) => Promise<LoginResult>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLocalMode, _setLocalModeState] = useState(
    () => localStorage.getItem('sadp_use_local_db') === 'true'
  );

  const setLocalMode = (enabled: boolean) => {
    if (enabled) {
      localStorage.setItem('sadp_use_local_db', 'true');
    } else {
      localStorage.removeItem('sadp_use_local_db');
      localStorage.removeItem('sadp_local_user');
    }
    _setLocalModeState(enabled);
    if (!enabled) {
      setUser(null);
    }
  };

  useEffect(() => {
    if (isLocalMode) {
      const storedUser = localStorage.getItem('sadp_local_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        setUser(null);
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (isLocalMode) return;
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser(userDoc.data() as User);
          } else {
            // This might happen if user is in Auth but not in Firestore
            setUser(null);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isLocalMode]);

  const login = async (email: string, password?: string): Promise<LoginResult> => {
    if (!password) return { success: false, error: 'Por favor, insira a senha.' };
    
    // Fallback automatico para modo local se tentarem logar com as credenciais locais padrão
    if (
      (email === 'dev@escola.com' && password === 'dev123') ||
      (email === 'admin@escola.com' && password === 'admin123') ||
      (email === 'joao@escola.com' && password === '123456')
    ) {
      return loginLocalUser(email);
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
      if (userDoc.exists()) {
        setUser(userDoc.data() as User);
        return { success: true };
      } else {
        await signOut(auth);
        return { 
          success: false, 
          error: 'E-mail autenticado, mas o perfil correspondente não foi encontrado no banco de dados (Firestore).' 
        };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMsg = 'Erro ao fazer login. Verifique sua conexão ou tente novamente.';
      
      if (error && error.code) {
        switch (error.code) {
          case 'auth/wrong-password':
          case 'auth/user-not-found':
          case 'auth/invalid-credential':
            errorMsg = 'E-mail ou senha incorretos.';
            break;
          case 'auth/invalid-email':
            errorMsg = 'O formato do e-mail inserido é inválido.';
            break;
          case 'auth/user-disabled':
            errorMsg = 'Este usuário foi desativado.';
            break;
          case 'auth/too-many-requests':
            errorMsg = 'Múltiplas tentativas falhas. O acesso a esta conta foi temporariamente desativado. Tente novamente mais tarde.';
            break;
          case 'auth/operation-not-allowed':
            errorMsg = 'O login por E-mail/Senha está desativado no seu Firebase. Por favor, utilize a opção "Entrar com Modo de Teste Local" para contornar esta limitação de permissão no console.';
            break;
          default:
            errorMsg = `Erro na autenticação: ${error.message} (${error.code})`;
        }
      } else if (error instanceof Error) {
        errorMsg = error.message;
      }
      
      return { success: false, error: errorMsg };
    }
  };

  const loginLocalUser = async (email: string): Promise<LoginResult> => {
    let localUser: User | null = null;
    if (email === 'dev@escola.com' || email === 'profcaiocianorte@gmail.com') {
      localUser = { id: 'dev_local_uid', name: 'Caio (Desenvolvedor Local)', email, role: 'developer' };
    } else if (email === 'admin@escola.com') {
      localUser = { id: 'coord_local_uid', name: 'Marta Coordenadora', email: 'admin@escola.com', role: 'coordinator' };
    } else if (email === 'joao@escola.com') {
      localUser = { id: 'teacher_local_uid', name: 'João Professor', email: 'joao@escola.com', role: 'teacher' };
    } else {
      localUser = { id: `custom_${Date.now()}`, name: email.split('@')[0], email, role: 'teacher' };
    }

    localStorage.setItem('sadp_use_local_db', 'true');
    localStorage.setItem('sadp_local_user', JSON.stringify(localUser));
    _setLocalModeState(true);
    setUser(localUser);
    return { success: true };
  };

  const loginWithGoogle = async (): Promise<LoginResult> => {
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
      if (userDoc.exists()) {
        setUser(userDoc.data() as User);
        return { success: true, isNewUser: false };
      } else {
        if (cred.user.email === 'profcaiocianorte@gmail.com') {
          const devUser: User = {
            id: cred.user.uid,
            name: cred.user.displayName || 'Caio (Admin)',
            email: cred.user.email || 'profcaiocianorte@gmail.com',
            role: 'developer'
          };
          await setDoc(doc(db, 'users', cred.user.uid), devUser);
          setUser(devUser);
          return { success: true, isNewUser: false };
        }
        return { success: true, isNewUser: true, firebaseUser: cred.user };
      }
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      // Se der erro de popup/segurança no iframe, sugere Modo Local
      let errorMsg = error.message || 'Erro ao entrar com Google.';
      if (error && (error.code === 'auth/popup-blocked' || error.message?.includes('popup') || error.message?.includes('iframe'))) {
        errorMsg = 'O navegador bloqueou a janela pop-up de login no iFrame do AI Studio. Por favor, clique no botão "Acessar via Modo de Teste Local" abaixo para entrar instantaneamente!';
      }
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    try {
      if (isLocalMode) {
        localStorage.removeItem('sadp_local_user');
        setUser(null);
      } else {
        await signOut(auth);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      loginWithGoogle, 
      logout, 
      loading, 
      setUser,
      isLocalMode,
      setLocalMode,
      loginLocalUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
