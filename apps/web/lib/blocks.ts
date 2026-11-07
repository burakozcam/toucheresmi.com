export const BLOCKS = [ [[1,1,1,1]], [[1,1],[1,1]], [[0,1,0],[1,1,1]], [[0,1,1],[1,1,0]], [[1,1,0],[0,1,1]], [[1,0,0],[1,1,1]], [[0,0,1],[1,1,1]] ];
export type Piece = { shape: number[][]; x: number; y: number; color: number };
export const emptyBoard = () => Array.from({ length: 20 }, () => Array(10).fill(0) as number[]);
export const rotateBlock = (shape: number[][]) => shape[0].map((_, x) => shape.map((row) => row[x]).reverse());
export function canPlace(board: number[][], piece: Piece) {
  return piece.shape.every((row, y) => row.every((cell, x) => !cell || piece.x + x >= 0 && piece.x + x < 10 && piece.y + y >= 0 && piece.y + y < 20 && !board[piece.y + y][piece.x + x]));
}
export function settleBlock(board: number[][], piece: Piece) {
  const next = board.map((r) => [...r]);
  piece.shape.forEach((row, y) => row.forEach((cell, x) => { if (cell) next[piece.y + y][piece.x + x] = piece.color; }));
  const remaining = next.filter((row) => row.some((cell) => !cell)); const cleared = 20 - remaining.length;
  return { board: [...Array.from({ length: cleared }, () => Array(10).fill(0)), ...remaining], cleared };
}
export function newPiece(index = Math.floor(Math.random() * BLOCKS.length)): Piece { const shape = BLOCKS[index].map((r) => [...r]); return { shape, x: Math.floor((10 - shape[0].length) / 2), y: 0, color: index + 1 }; }
