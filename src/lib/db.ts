import { User, Class, Student, Evaluation, EvaluationLevel, Message } from '../types';

const DB_KEY = 'psico_db_demo_v2';

interface DbSchema {
  users: User[];
  classes: Class[];
  students: Student[];
  evaluations: Evaluation[];
  messages: Message[];
}

function generateDemoData(): DbSchema {
  const data: DbSchema = {
    users: [
      { id: '0', name: 'Desenvolvedor', email: 'dev@escola.com', role: 'developer', password: 'dev' },
      { id: '1', name: 'Coordenador Admin', email: 'admin@escola.com', role: 'coordinator', password: 'admin' },
      { id: '2', name: 'Professor João', email: 'joao@escola.com', role: 'teacher', password: '123', schools: ['Escola Municipal A', 'Escola Municipal B'] },
    ],
    classes: [],
    students: [],
    evaluations: [],
    messages: []
  };

  const classNames = ['Pré 1', 'Pré 2', '1º ano', '2º ano', '3º ano', '4º ano', '5º ano'];
  const teacherId = '2';
  
  const firstNames = ['Miguel', 'Arthur', 'Gael', 'Heitor', 'Theo', 'Davi', 'Gabriel', 'Bernardo', 'Samuel', 'João Miguel', 'Enzo Gabriel', 'Alice', 'Laura', 'Helena', 'Valentina', 'Sophia', 'Isabella', 'Manuela', 'Júlia', 'Heloísa', 'Lívia', 'Maria Eduarda', 'Lorena', 'Giovanna', 'Maria Clara', 'Pedro', 'Lucas', 'Matheus', 'Gustavo', 'Rafael', 'Nicolas', 'Guilherme', 'Felipe', 'Isaac', 'Zayn', 'Lucca', 'Daniel', 'Beatriz', 'Mariana', 'Melissa', 'Cecília', 'Esther', 'Emanuelly', 'Sarah', 'Lavínia', 'Isadora', 'Isabelly', 'Catarina'];
  const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Dias', 'Borges', 'Mendes', 'Nunes', 'Melo'];

  let studentIdCounter = 1;
  let evalIdCounter = 1;

  classNames.forEach((className, index) => {
    const classId = `c${index + 1}`;
    data.classes.push({
      id: classId,
      name: className,
      teacherId,
      year: 2026
    });

    for (let i = 0; i < 25; i++) {
      const studentId = `s${studentIdCounter++}`;
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      
      data.students.push({
        id: studentId,
        name: `${firstName} ${lastName}`,
        classId,
        birthDate: `201${8 - index}-0${Math.floor(Math.random() * 8) + 1}-1${Math.floor(Math.random() * 8) + 1}`
      });

      // Generate evaluation for Trimester 1
      const items = [];
      for (let itemId = 1; itemId <= 40; itemId++) {
        const rand = Math.random();
        let level: EvaluationLevel = 'BEM';
        // Make older kids perform slightly better
        const difficultyFactor = index * 0.05; 
        if (rand > 0.85 + difficultyFactor) level = 'NAO_EXECUTA';
        else if (rand > 0.6 + difficultyFactor) level = 'DIFICULDADE';

        items.push({ itemId, level });
      }

      data.evaluations.push({
        id: `e${evalIdCounter++}`,
        studentId,
        classId,
        teacherId,
        trimester: 1,
        date: new Date().toISOString(),
        items
      });
    }
  });

  return data;
}

export const getDb = (): DbSchema => {
  const data = localStorage.getItem(DB_KEY);
  if (!data) {
    const demoData = generateDemoData();
    localStorage.setItem(DB_KEY, JSON.stringify(demoData));
    return demoData;
  }
  
  const parsed = JSON.parse(data);
  // Ensure developer exists
  if (!parsed.users.some((u: User) => u.role === 'developer')) {
    parsed.users.push({ id: '0', name: 'Desenvolvedor', email: 'dev@escola.com', role: 'developer', password: 'dev' });
    localStorage.setItem(DB_KEY, JSON.stringify(parsed));
  }
  
  return parsed;
};

export const saveDb = (data: DbSchema) => {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
};

export const db = {
  getUsers: () => getDb().users,
  addUser: (user: User) => {
    const data = getDb();
    data.users.push(user);
    saveDb(data);
  },
  updateUser: (user: User) => {
    const data = getDb();
    const index = data.users.findIndex(u => u.id === user.id);
    if (index >= 0) {
      data.users[index] = user;
      saveDb(data);
    }
  },
  deleteUser: (userId: string) => {
    const data = getDb();
    data.users = data.users.filter(u => u.id !== userId);
    // Note: We might want to handle orphan classes/evaluations here, 
    // but for now just deleting the user is fine for the demo.
    saveDb(data);
  },
  getClasses: () => getDb().classes,
  addClass: (cls: Class) => {
    const data = getDb();
    data.classes.push(cls);
    saveDb(data);
  },
  updateClass: (cls: Class) => {
    const data = getDb();
    const index = data.classes.findIndex(c => c.id === cls.id);
    if (index >= 0) {
      data.classes[index] = cls;
      saveDb(data);
    }
  },
  getStudents: () => getDb().students,
  addStudent: (student: Student) => {
    const data = getDb();
    data.students.push(student);
    saveDb(data);
  },
  getEvaluations: () => getDb().evaluations,
  addEvaluation: (evaluation: Evaluation) => {
    const data = getDb();
    const existingIndex = data.evaluations.findIndex(e => e.studentId === evaluation.studentId && e.trimester === evaluation.trimester);
    if (existingIndex >= 0) {
      data.evaluations[existingIndex] = evaluation;
    } else {
      data.evaluations.push(evaluation);
    }
    saveDb(data);
  },
  deleteClass: (classId: string) => {
    const data = getDb();
    // Delete class
    data.classes = data.classes.filter(c => c.id !== classId);
    // Delete associated students
    const studentsToDelete = data.students.filter(s => s.classId === classId).map(s => s.id);
    data.students = data.students.filter(s => s.classId !== classId);
    // Delete associated evaluations
    data.evaluations = data.evaluations.filter(e => !studentsToDelete.includes(e.studentId));
    saveDb(data);
  },
  deleteStudent: (studentId: string) => {
    const data = getDb();
    // Delete student
    data.students = data.students.filter(s => s.id !== studentId);
    // Delete associated evaluations
    data.evaluations = data.evaluations.filter(e => e.studentId !== studentId);
    saveDb(data);
  },
  getMessages: (userId: string) => {
    const data = getDb();
    return (data.messages || []).filter(m => m.receiverId === userId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },
  addMessage: (message: Message) => {
    const data = getDb();
    if (!data.messages) data.messages = [];
    data.messages.push(message);
    saveDb(data);
  },
  markMessageAsRead: (messageId: string) => {
    const data = getDb();
    if (!data.messages) return;
    const msg = data.messages.find(m => m.id === messageId);
    if (msg) {
      msg.read = true;
      saveDb(data);
    }
  }
};
