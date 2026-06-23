import { User, Class, Student, Evaluation, Message } from '../types';
import { db as firestore, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  writeBatch
} from 'firebase/firestore';

export const isLocalMode = () => localStorage.getItem('sadp_use_local_db') === 'true';

// Local storage helpers
const getLocalCollection = <T>(key: string): T[] => {
  const value = localStorage.getItem(key);
  return value ? JSON.parse(value) : [];
};

const setLocalCollection = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Auto semente (seed) para o modo local
export const seedLocalDb = (force = false) => {
  if (!force && localStorage.getItem('sadp_local_seeded') === 'true') {
    return;
  }

  const localUsers: User[] = [
    { id: 'dev_local_uid', name: 'Caio (Desenvolvedor Local)', email: 'dev@escola.com', role: 'developer' },
    { id: 'coord_local_uid', name: 'Marta Coordenadora', email: 'admin@escola.com', role: 'coordinator' },
    { id: 'teacher_local_uid', name: 'João Professor', email: 'joao@escola.com', role: 'teacher' }
  ];

  const localClasses: Class[] = [
    { id: 'class_local_1', name: '1º Ano A - Vespertino', teacherId: 'teacher_local_uid', year: 2026, school: 'Escola Municipal Gonçalo Moreno' },
    { id: 'class_local_2', name: '2º Ano B - Matutino', teacherId: 'teacher_local_uid', year: 2026, school: 'Escola Municipal Rainha da Paz' },
    { id: 'class_local_3', name: '5º Ano A - Vespertino', teacherId: 'teacher_local_uid', year: 2026, school: 'Escola Municipal Gonçalo Moreno' },
    { id: 'class_local_dev_1', name: '3º Ano C - Cianorte', teacherId: 'dev_local_uid', year: 2026, school: 'Escola Central' }
  ];

  const localStudents: Student[] = [
    { id: 'st_local_1', name: 'Arthur Silva Mendonça', classId: 'class_local_1', birthDate: '2019-04-12' },
    { id: 'st_local_2', name: 'Beatriz Ramos de Castro', classId: 'class_local_1', birthDate: '2019-08-22' },
    { id: 'st_local_3', name: 'Caio Vinícius Oliveira', classId: 'class_local_1', birthDate: '2019-01-05' },
    { id: 'st_local_4', name: 'Davi Miguel Ferreira', classId: 'class_local_1', birthDate: '2019-11-14' },
    { id: 'st_local_5', name: 'Eloá Cristina Santos', classId: 'class_local_1', birthDate: '2019-06-30' },

    { id: 'st_local_6', name: 'Gabriel Henrique Lima', classId: 'class_local_2', birthDate: '2018-03-15' },
    { id: 'st_local_7', name: 'Helena Vitória Gomes', classId: 'class_local_2', birthDate: '2018-05-20' },
    { id: 'st_local_8', name: 'Isabella Rodrigues', classId: 'class_local_2', birthDate: '2018-09-11' },

    { id: 'st_local_9', name: 'Nicole Souza Rocha', classId: 'class_local_3', birthDate: '2015-10-22' },
    { id: 'st_local_10', name: 'Otávio Augusto Alves', classId: 'class_local_3', birthDate: '2015-06-03' },

    { id: 'st_local_11', name: 'Clara Maria Ribeiro', classId: 'class_local_dev_1', birthDate: '2017-03-14' },
    { id: 'st_local_12', name: 'Felipe Neto Guimarães', classId: 'class_local_dev_1', birthDate: '2017-07-25' }
  ];

  const localEvaluations: Evaluation[] = [];
  const trimesters = [1, 2] as const;

  localStudents.forEach((student) => {
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

      let teacherId = 'teacher_local_uid';
      if (student.classId === 'class_local_dev_1') {
        teacherId = 'dev_local_uid';
      }

      localEvaluations.push({
        id: `eval_local_${student.id}_t${trimester}`,
        studentId: student.id,
        classId: student.classId,
        teacherId,
        trimester,
        date: trimester === 1 ? '2026-04-10T14:30:00Z' : '2026-08-15T10:00:00Z',
        items,
        notes: `Desenvolvimento ${trimester === 1 ? 'inicial' : 'com excelente evolução'} observado localmente nas aulas de EF.`
      });
    });
  });

  const localMessages: Message[] = [
    {
      id: 'msg_local_1',
      senderId: 'coord_local_uid',
      receiverId: 'teacher_local_uid',
      content: 'Olá Professor João! Entrei para avisar que o sistema local está totalmente operacional.',
      timestamp: new Date().toISOString(),
      read: false
    },
    {
      id: 'msg_local_2',
      senderId: 'coord_local_uid',
      receiverId: 'dev_local_uid',
      content: 'Bem-vindo ao modo local offline, Caio! Aqui, todos os testes ocorrem instantaneamente no seu navegador sem limite ou dependência de Auth do Firebase.',
      timestamp: new Date().toISOString(),
      read: false
    }
  ];

  setLocalCollection('sadp_local_users', localUsers);
  setLocalCollection('sadp_local_classes', localClasses);
  setLocalCollection('sadp_local_students', localStudents);
  setLocalCollection('sadp_local_evaluations', localEvaluations);
  setLocalCollection('sadp_local_messages', localMessages);

  localStorage.setItem('sadp_local_seeded', 'true');
};

export const clearLocalDb = () => {
  localStorage.removeItem('sadp_local_users');
  localStorage.removeItem('sadp_local_classes');
  localStorage.removeItem('sadp_local_students');
  localStorage.removeItem('sadp_local_evaluations');
  localStorage.removeItem('sadp_local_messages');
  localStorage.removeItem('sadp_local_seeded');
  seedLocalDb(true);
};

export const db = {
  getUsers: async (): Promise<User[]> => {
    if (isLocalMode()) {
      seedLocalDb();
      return getLocalCollection<User>('sadp_local_users');
    }
    const path = 'users';
    try {
      const snapshot = await getDocs(collection(firestore, path));
      return snapshot.docs.map(d => d.data() as User);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  addUser: async (user: User) => {
    if (isLocalMode()) {
      seedLocalDb();
      const users = getLocalCollection<User>('sadp_local_users');
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userData } = user;
      const index = users.findIndex(u => u.id === user.id);
      if (index >= 0) {
        users[index] = { ...users[index], ...userData };
      } else {
        users.push(userData as User);
      }
      setLocalCollection('sadp_local_users', users);
      return;
    }
    const path = `users/${user.id}`;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userData } = user;
      await setDoc(doc(firestore, 'users', user.id), userData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },
  updateUser: async (user: User) => {
    if (isLocalMode()) {
      seedLocalDb();
      const users = getLocalCollection<User>('sadp_local_users');
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userData } = user;
      const index = users.findIndex(u => u.id === user.id);
      if (index >= 0) {
        users[index] = { ...users[index], ...userData };
        setLocalCollection('sadp_local_users', users);
      }
      return;
    }
    const path = `users/${user.id}`;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userData } = user;
      await updateDoc(doc(firestore, 'users', user.id), { ...userData });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
  deleteUser: async (userId: string) => {
    if (isLocalMode()) {
      seedLocalDb();
      const users = getLocalCollection<User>('sadp_local_users');
      setLocalCollection('sadp_local_users', users.filter(u => u.id !== userId));
      return;
    }
    const path = `users/${userId}`;
    try {
      await deleteDoc(doc(firestore, 'users', userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
  getClasses: async (): Promise<Class[]> => {
    if (isLocalMode()) {
      seedLocalDb();
      return getLocalCollection<Class>('sadp_local_classes');
    }
    const path = 'classes';
    try {
      const snapshot = await getDocs(collection(firestore, path));
      return snapshot.docs.map(d => d.data() as Class);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  addClass: async (cls: Class) => {
    if (isLocalMode()) {
      seedLocalDb();
      const classes = getLocalCollection<Class>('sadp_local_classes');
      classes.push(cls);
      setLocalCollection('sadp_local_classes', classes);
      return;
    }
    const path = `classes/${cls.id}`;
    try {
      await setDoc(doc(firestore, 'classes', cls.id), cls);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },
  updateClass: async (cls: Class) => {
    if (isLocalMode()) {
      seedLocalDb();
      const classes = getLocalCollection<Class>('sadp_local_classes');
      const index = classes.findIndex(c => c.id === cls.id);
      if (index >= 0) {
        classes[index] = cls;
        setLocalCollection('sadp_local_classes', classes);
      }
      return;
    }
    const path = `classes/${cls.id}`;
    try {
      await updateDoc(doc(firestore, 'classes', cls.id), { ...cls });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
  getStudents: async (): Promise<Student[]> => {
    if (isLocalMode()) {
      seedLocalDb();
      return getLocalCollection<Student>('sadp_local_students');
    }
    const path = 'students';
    try {
      const snapshot = await getDocs(collection(firestore, path));
      return snapshot.docs.map(d => d.data() as Student);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  addStudent: async (student: Student) => {
    if (isLocalMode()) {
      seedLocalDb();
      const students = getLocalCollection<Student>('sadp_local_students');
      students.push(student);
      setLocalCollection('sadp_local_students', students);
      return;
    }
    const path = `students/${student.id}`;
    try {
      await setDoc(doc(firestore, 'students', student.id), student);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },
  getEvaluations: async (): Promise<Evaluation[]> => {
    if (isLocalMode()) {
      seedLocalDb();
      return getLocalCollection<Evaluation>('sadp_local_evaluations');
    }
    const path = 'evaluations';
    try {
      const snapshot = await getDocs(collection(firestore, path));
      return snapshot.docs.map(d => d.data() as Evaluation);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  addEvaluation: async (evaluation: Evaluation) => {
    if (isLocalMode()) {
      seedLocalDb();
      const evals = getLocalCollection<Evaluation>('sadp_local_evaluations');
      const index = evals.findIndex(e => e.id === evaluation.id);
      if (index >= 0) {
        evals[index] = evaluation;
      } else {
        evals.push(evaluation);
      }
      setLocalCollection('sadp_local_evaluations', evals);
      return;
    }
    const path = `evaluations/${evaluation.id}`;
    try {
      await setDoc(doc(firestore, 'evaluations', evaluation.id), evaluation);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },
  deleteClass: async (classId: string) => {
    if (isLocalMode()) {
      seedLocalDb();
      const classes = getLocalCollection<Class>('sadp_local_classes');
      setLocalCollection('sadp_local_classes', classes.filter(c => c.id !== classId));
      return;
    }
    const path = `classes/${classId}`;
    try {
      const batch = writeBatch(firestore);
      batch.delete(doc(firestore, 'classes', classId));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
  deleteStudent: async (studentId: string) => {
    if (isLocalMode()) {
      seedLocalDb();
      const students = getLocalCollection<Student>('sadp_local_students');
      setLocalCollection('sadp_local_students', students.filter(s => s.id !== studentId));
      return;
    }
    const path = `students/${studentId}`;
    try {
      await deleteDoc(doc(firestore, 'students', studentId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
  getMessages: async (userId: string): Promise<Message[]> => {
    if (isLocalMode()) {
      seedLocalDb();
      const messages = getLocalCollection<Message>('sadp_local_messages');
      return messages
        .filter(m => m.receiverId === userId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    const path = 'messages';
    try {
      const q = query(
        collection(firestore, path), 
        where('receiverId', '==', userId),
        orderBy('timestamp', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data() as Message);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  addMessage: async (message: Message) => {
    if (isLocalMode()) {
      seedLocalDb();
      const messages = getLocalCollection<Message>('sadp_local_messages');
      messages.push(message);
      setLocalCollection('sadp_local_messages', messages);
      return;
    }
    const path = `messages/${message.id}`;
    try {
      await setDoc(doc(firestore, 'messages', message.id), message);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },
  markMessageAsRead: async (messageId: string) => {
    if (isLocalMode()) {
      seedLocalDb();
      const messages = getLocalCollection<Message>('sadp_local_messages');
      const index = messages.findIndex(m => m.id === messageId);
      if (index >= 0) {
        messages[index].read = true;
        setLocalCollection('sadp_local_messages', messages);
      }
      return;
    }
    const path = `messages/${messageId}`;
    try {
      await updateDoc(doc(firestore, 'messages', messageId), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
};
