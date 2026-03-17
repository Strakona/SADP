export type Role = 'coordinator' | 'teacher' | 'developer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  password?: string;
  schools?: string[];
  notes?: string;
}

export interface Class {
  id: string;
  name: string;
  teacherId: string;
  year: number;
  school?: string;
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  birthDate: string;
}

export type EvaluationLevel = 'BEM' | 'DIFICULDADE' | 'NAO_EXECUTA';

export interface EvaluationItem {
  itemId: number;
  level: EvaluationLevel;
}

export interface Evaluation {
  id: string;
  studentId: string;
  classId: string;
  teacherId: string;
  trimester: 1 | 2 | 3;
  date: string;
  items: EvaluationItem[];
  notes?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
  link?: string;
  linkText?: string;
}

export const EVALUATION_CATEGORIES = [
  {
    id: 'locomocao',
    name: 'Locomoção',
    items: [
      { id: 1, name: 'Caminha sem dificuldade' },
      { id: 2, name: 'Caminha para trás' },
      { id: 3, name: 'Caminha de lado' },
      { id: 4, name: 'Caminha em ponta dos pés' },
      { id: 5, name: 'Caminha em linha recta sobre uma linha' },
      { id: 6, name: 'Corre alternando movimento de pernas e braços' },
      { id: 7, name: 'Sobe escadas alternando os pés' },
    ]
  },
  {
    id: 'posicao',
    name: 'Posição',
    items: [
      { id: 8, name: 'Mantem-se na posição de cócoras' },
      { id: 9, name: 'Mantem-se na posição de joelhos' },
      { id: 10, name: 'Senta-se no chão com as pernas cruzadas' },
    ]
  },
  {
    id: 'equilibrio',
    name: 'Equilíbrio',
    items: [
      { id: 11, name: 'Mantem-se sobre o pé direito sem ajuda' },
      { id: 12, name: 'Mantem-se sobre pé esquerdo sem ajuda' },
      { id: 13, name: 'Mantem-se com os dois pés no banco' },
      { id: 14, name: 'Anda sobre o banco alternando os pés' },
      { id: 15, name: 'Anda sobre o banco para a frente, para trás e de lado' },
      { id: 16, name: 'Mantem-se sobre um pé (olhos fechados) por 10 segundos ou mais' },
    ]
  },
  {
    id: 'coord_pernas',
    name: 'Coordenação de Pernas',
    items: [
      { id: 17, name: 'Salta desde uma altura de 40 cm' },
      { id: 18, name: 'Salta longitudinalmente de 35 a 60 cm' },
      { id: 19, name: 'Salta uma corda a 25cm de altura' },
      { id: 20, name: 'Salta mais de 10 vezes com ritmo' },
      { id: 21, name: 'Salta para a frente 10 vezes ou mais' },
      { id: 22, name: 'Salta para trás 5 vezes ou mais sem cair' },
    ]
  },
  {
    id: 'coord_bracos',
    name: 'Coordenação de Braços',
    items: [
      { id: 23, name: 'Lança uma bola com as duas mãos a 1m' },
      { id: 24, name: 'Apanha a bola com as duas mãos quando lhe é lançada' },
      { id: 25, name: 'Lança a bola ao ar e apanha 2 vezes' },
      { id: 26, name: 'Lança a bola mais de 4 vezes controlando-a' },
      { id: 27, name: 'Aguenta o saco de feijão numa só mão' },
    ]
  },
  {
    id: 'coord_mao',
    name: 'Coordenação da Mão',
    items: [
      { id: 28, name: 'Corta papel com tesoura' },
      { id: 29, name: 'Corta papel seguindo uma recta' },
      { id: 30, name: 'Corta papel seguindo uma curva' },
      { id: 31, name: 'Aperta uma rosca' },
      { id: 32, name: 'Com os dedos dobrados, toca um a um com o polegar' },
    ]
  },
  {
    id: 'esquema_si',
    name: 'Esquema Corporal em si mesmo',
    items: [
      { id: 33, name: 'Conhece bem as suas mãos, pés, cabeça, pernas e braços' },
      { id: 34, name: 'Mostra a mão direita quando se pede' },
      { id: 35, name: 'Mostra a mão esquerda' },
      { id: 36, name: 'Toca na perna direita com a mão direita' },
      { id: 37, name: 'Toca no joelho direito com a mão esquerda' },
    ]
  },
  {
    id: 'esquema_outros',
    name: 'Esquema Corporal nos outros',
    items: [
      { id: 38, name: 'Aponta para o cotovelo' },
      { id: 39, name: 'Aponta a mão direita' },
      { id: 40, name: 'Aponta o pé esquerdo' },
    ]
  }
];

export const ALL_ITEMS = EVALUATION_CATEGORIES.flatMap(c => c.items);
