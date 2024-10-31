import './style.css';
import { Game } from './game';
import { GRID_SIZE, CELL_SIZE } from './constants';

const canvas = document.createElement('canvas');
canvas.width = GRID_SIZE * CELL_SIZE;
canvas.height = GRID_SIZE * CELL_SIZE + 100; // Extra space for UI
document.body.appendChild(canvas);

new Game(canvas);