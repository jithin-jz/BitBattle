export interface User {
  id: string;
  username: string;
  email: string;
  rating: number;
  wins: number;
  losses: number;
  avatar_url?: string;
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  time_limit: number;
  memory_limit: number;
}

export interface TestCase {
  input: string;
  expected_output: string;
  is_public: boolean;
}

export interface MatchState {
  matchId: string | null;
  status: 'idle' | 'matched' | 'started' | 'finished';
  problem: Problem | null;
  testCases: TestCase[];
  timeRemaining: number;
  winnerId: string | null;
  player1Id: string | null;
  player2Id: string | null;
  player1Username: string | null;
  player2Username: string | null;
  player1Avatar?: string | null;
  player2Avatar?: string | null;
  opponentId?: string | null;
}

export type OpponentStatus = 'waiting' | 'coding' | 'typing' | 'submitted' | 'disconnected';

export interface TestResult {
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  error?: string;
}
