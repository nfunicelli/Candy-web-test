export interface Position {
  row: number;
  col: number;
}

export interface Candy {
  type: number;
  x: number;
  y: number;
  row: number;
  col: number;
  isSpecial?: boolean;
  specialType?: 'row' | 'column' | 'bomb' | 'rainbow';
}

export interface GameState {
  score: number;
  moves: number;
  targetScore: number;
}