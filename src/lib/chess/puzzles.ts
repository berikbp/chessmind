import type { Color } from "chess.js";

export interface Puzzle {
  difficulty: "easy" | "medium";
  fen: string;
  goal: string;
  id: string;
  sideToMove: Color;
  solution: string[];
  theme: string;
  title: string;
}

export const PUZZLES: Puzzle[] = [
  {
    difficulty: "easy",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 2 4",
    goal: "Mate in one.",
    id: "scholars-mate",
    sideToMove: "w",
    solution: ["h5f7"],
    theme: "Weak f7 square",
    title: "Finish the attack",
  },
  {
    difficulty: "medium",
    fen: "3q3k/6pp/7N/8/8/8/6PP/6K1 w - - 0 1",
    goal: "Fork king and queen.",
    id: "white-knight-fork",
    sideToMove: "w",
    solution: ["h6f7"],
    theme: "Knight fork",
    title: "Check and attack the queen",
  },
  {
    difficulty: "medium",
    fen: "4k3/4q3/8/6B1/8/8/8/4R1K1 w - - 0 1",
    goal: "Win the pinned queen.",
    id: "pinned-queen-rook",
    sideToMove: "w",
    solution: ["e1e7"],
    theme: "Absolute pin",
    title: "Pinned queen",
  },
  {
    difficulty: "easy",
    fen: "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2",
    goal: "Mate the exposed king.",
    id: "fools-mate",
    sideToMove: "b",
    solution: ["d8h4"],
    theme: "King safety",
    title: "Punish the open diagonal",
  },
  {
    difficulty: "medium",
    fen: "4k2r/8/8/6B1/8/8/8/3QK3 w - - 0 1",
    goal: "Fork king and rook.",
    id: "protected-queen-fork",
    sideToMove: "w",
    solution: ["d1d8"],
    theme: "Protected fork",
    title: "Protected queen fork",
  },
  {
    difficulty: "easy",
    fen: "7k/5KP1/8/8/8/8/8/8 w - - 0 1",
    goal: "Promote with mate.",
    id: "promotion-mate",
    sideToMove: "w",
    solution: ["g7g8q"],
    theme: "Promotion",
    title: "Promote safely",
  },
  {
    difficulty: "easy",
    fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
    goal: "Use the back rank.",
    id: "back-rank-rook",
    sideToMove: "w",
    solution: ["e1e8"],
    theme: "Back rank mate",
    title: "Cut the king off",
  },
  {
    difficulty: "medium",
    fen: "4k3/3q4/1N6/8/8/7B/8/4K3 w - - 0 1",
    goal: "Capture the queen with check.",
    id: "protected-bishop-capture",
    sideToMove: "w",
    solution: ["h3d7"],
    theme: "Protected capture",
    title: "Bishop takes the queen",
  },
  {
    difficulty: "medium",
    fen: "6rk/6pp/8/6N1/8/8/6PP/6K1 w - - 0 1",
    goal: "Deliver knight mate.",
    id: "knight-net-mate",
    sideToMove: "w",
    solution: ["g5f7"],
    theme: "Knight mate",
    title: "No escape squares",
  },
  {
    difficulty: "medium",
    fen: "3qk3/8/8/8/6b1/8/8/4K2R b - - 0 1",
    goal: "Fork king and rook.",
    id: "black-protected-queen-fork",
    sideToMove: "b",
    solution: ["d8d1"],
    theme: "Protected fork",
    title: "Black queen fork",
  },
];

export function getPuzzleByIndex(index: number) {
  return PUZZLES[((index % PUZZLES.length) + PUZZLES.length) % PUZZLES.length];
}
