export interface Stage {
  id: number;
  nome: string;
  cor: string;
  ordem: number;
  boardId?: number;
}

export interface Board {
  id: number;
  nome: string;
  estagios: Stage[];
}

export interface Pipeline {
  id: number;
  nome: string;
  boardId: number;
  colecaoId: string;
  criadoEm?: string;
}

export interface Card {
  id: number;
  clienteId: string;
  estagioId: number;
  notas: string | null;
  cliente?: {
    fantasia: string | null;
    nome: string | null;
    cidade?: string | null;
    uf?: string | null;
  };
}

export interface Theme {
  bg: string;
  card: string;
  text: string;
  secondary: string;
  border: string;
  accent: string;
  red: string;
  green: string;
}
