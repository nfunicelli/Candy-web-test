import { gsap } from 'gsap';
import { Position, Candy, GameState } from './types';
import { GRID_SIZE, CELL_SIZE, CANDY_TYPES, COLORS, ANIMATION_DURATION } from './constants';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private board: (Candy | null)[][];
  private selectedCandy: Position | null = null;
  private state: GameState;
  private animating = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.board = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    this.state = {
      score: 0,
      moves: 30,
      targetScore: 1000,
    };

    this.initializeBoard();
    this.setupEventListeners();
    this.gameLoop();
  }

  private initializeBoard() {
    // First, fill the board with new candies
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        this.board[row][col] = this.createCandy(row, col);
      }
    }
    
    // Remove initial matches
    let matches = this.findMatches();
    while (matches.length > 0) {
      matches.forEach(match => {
        match.forEach(({ row, col }) => {
          if (this.board[row][col]) {
            this.board[row][col] = this.createCandy(row, col);
          }
        });
      });
      matches = this.findMatches();
    }
  }

  private createCandy(row: number, col: number): Candy {
    return {
      type: Math.floor(Math.random() * CANDY_TYPES),
      x: col * CELL_SIZE,
      y: row * CELL_SIZE,
      row,
      col,
    };
  }

  private setupEventListeners() {
    this.canvas.addEventListener('click', (e) => {
      if (this.animating) return;

      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const col = Math.floor(x / CELL_SIZE);
      const row = Math.floor(y / CELL_SIZE);

      if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        this.handleClick(row, col);
      }
    });
  }

  private handleClick(row: number, col: number) {
    if (!this.board[row][col]) return;

    if (!this.selectedCandy) {
      this.selectedCandy = { row, col };
    } else {
      const { row: prevRow, col: prevCol } = this.selectedCandy;
      
      if (this.isAdjacent(prevRow, prevCol, row, col)) {
        this.swapCandies(prevRow, prevCol, row, col);
      }
      
      this.selectedCandy = null;
    }
  }

  private isAdjacent(row1: number, col1: number, row2: number, col2: number): boolean {
    return (Math.abs(row1 - row2) === 1 && col1 === col2) ||
           (Math.abs(col1 - col2) === 1 && row1 === row2);
  }

  private async swapCandies(row1: number, col1: number, row2: number, col2: number) {
    const candy1 = this.board[row1][col1];
    const candy2 = this.board[row2][col2];
    
    if (!candy1 || !candy2) return;

    this.animating = true;

    // Animate the swap
    await Promise.all([
      gsap.to(candy1, {
        x: candy2.x,
        y: candy2.y,
        duration: ANIMATION_DURATION,
      }),
      gsap.to(candy2, {
        x: candy1.x,
        y: candy1.y,
        duration: ANIMATION_DURATION,
      }),
    ]);

    // Update board
    this.board[row1][col1] = candy2;
    this.board[row2][col2] = candy1;
    
    // Update positions
    [candy1.row, candy1.col, candy2.row, candy2.col] = [candy2.row, candy2.col, candy1.row, candy1.col];

    const matches = this.findMatches();
    if (matches.length > 0) {
      this.state.moves--;
      await this.handleMatches();
    } else {
      // Swap back if no matches
      await this.swapCandies(row2, col2, row1, col1);
    }

    this.animating = false;
  }

  private findMatches(): Position[][] {
    const matches: Position[][] = [];
    
    // Check horizontal matches
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE - 2; col++) {
        const candy1 = this.board[row][col];
        const candy2 = this.board[row][col + 1];
        const candy3 = this.board[row][col + 2];
        
        if (candy1 && candy2 && candy3 && 
            candy1.type === candy2.type && 
            candy1.type === candy3.type) {
          matches.push([
            { row, col },
            { row, col: col + 1 },
            { row, col: col + 2 },
          ]);
        }
      }
    }

    // Check vertical matches
    for (let row = 0; row < GRID_SIZE - 2; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const candy1 = this.board[row][col];
        const candy2 = this.board[row + 1][col];
        const candy3 = this.board[row + 2][col];
        
        if (candy1 && candy2 && candy3 && 
            candy1.type === candy2.type && 
            candy1.type === candy3.type) {
          matches.push([
            { row, col },
            { row: row + 1, col },
            { row: row + 2, col },
          ]);
        }
      }
    }

    return matches;
  }

  private async handleMatches() {
    let matches = this.findMatches();
    while (matches.length > 0) {
      await this.removeMatches();
      await this.fillEmptySpaces();
      matches = this.findMatches();
    }
  }

  private async removeMatches() {
    const matches = this.findMatches();
    const removed = new Set<string>();

    matches.forEach(match => {
      match.forEach(({ row, col }) => {
        const key = `${row},${col}`;
        if (!removed.has(key)) {
          removed.add(key);
          this.state.score += 10;
          this.board[row][col] = null;
        }
      });
    });

    // Animate removal
    await new Promise(resolve => setTimeout(resolve, ANIMATION_DURATION * 1000));
  }

  private async fillEmptySpaces() {
    // Move existing candies down
    for (let col = 0; col < GRID_SIZE; col++) {
      let emptyRow = GRID_SIZE - 1;
      while (emptyRow >= 0) {
        if (!this.board[emptyRow][col]) {
          let fullRow = emptyRow - 1;
          while (fullRow >= 0 && !this.board[fullRow][col]) {
            fullRow--;
          }
          if (fullRow >= 0) {
            const candy = this.board[fullRow][col];
            if (candy) {
              this.board[emptyRow][col] = candy;
              this.board[fullRow][col] = null;
              candy.row = emptyRow;
              await gsap.to(candy, {
                y: emptyRow * CELL_SIZE,
                duration: ANIMATION_DURATION,
              });
            }
          }
        }
        emptyRow--;
      }
    }

    // Fill remaining empty spaces with new candies
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (!this.board[row][col]) {
          const candy = this.createCandy(row, col);
          candy.y = -CELL_SIZE;
          this.board[row][col] = candy;
          await gsap.to(candy, {
            y: row * CELL_SIZE,
            duration: ANIMATION_DURATION,
          });
        }
      }
    }
  }

  private gameLoop() {
    this.draw();
    requestAnimationFrame(() => this.gameLoop());
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw board
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        // Draw cell background
        this.ctx.fillStyle = (row + col) % 2 === 0 ? '#f0f0f0' : '#e0e0e0';
        this.ctx.fillRect(
          col * CELL_SIZE,
          row * CELL_SIZE,
          CELL_SIZE,
          CELL_SIZE
        );

        // Draw candy
        const candy = this.board[row][col];
        if (candy) {
          this.ctx.fillStyle = COLORS[candy.type];
          this.ctx.beginPath();
          this.ctx.arc(
            candy.x + CELL_SIZE / 2,
            candy.y + CELL_SIZE / 2,
            CELL_SIZE * 0.4,
            0,
            Math.PI * 2
          );
          this.ctx.fill();
        }
      }
    }

    // Draw selection
    if (this.selectedCandy) {
      const { row, col } = this.selectedCandy;
      this.ctx.strokeStyle = '#ff0000';
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(
        col * CELL_SIZE,
        row * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE
      );
    }

    // Draw UI
    this.ctx.fillStyle = '#000';
    this.ctx.font = '20px Arial';
    this.ctx.fillText(`Score: ${this.state.score}`, 10, GRID_SIZE * CELL_SIZE + 30);
    this.ctx.fillText(`Moves: ${this.state.moves}`, 10, GRID_SIZE * CELL_SIZE + 60);
    this.ctx.fillText(`Target: ${this.state.targetScore}`, 10, GRID_SIZE * CELL_SIZE + 90);
  }
}