import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MatchState, OpponentStatus } from '../../shared/types';

interface BattleState {
  data: MatchState;
  opponentStatus: OpponentStatus;
  playerStatuses: Record<string, { username: string; connected: boolean }>;
}

const initialState: BattleState = {
  data: {
    matchId: null,
    status: 'idle',
    problem: null,
    testCases: [],
    timeRemaining: 0,
    winnerId: null,
    player1Id: null,
    player2Id: null,
    player1Username: null,
    player2Username: null,
  },
  opponentStatus: 'waiting',
  playerStatuses: {},
};

export const battleSlice = createSlice({
  name: 'battle',
  initialState,
  reducers: {
    setMatchData: (state, action: PayloadAction<Partial<MatchState>>) => {
      state.data = { ...state.data, ...action.payload };
    },
    updateTimer: (state, action: PayloadAction<number>) => {
      state.data.timeRemaining = action.payload;
    },
    setOpponentStatus: (state, action: PayloadAction<OpponentStatus>) => {
      state.opponentStatus = action.payload;
    },
    setPlayerConnection: (state, action: PayloadAction<{ userId: string; username: string; connected: boolean }>) => {
      state.playerStatuses[action.payload.userId] = {
        username: action.payload.username,
        connected: action.payload.connected,
      };
    },
    resetBattle: (state) => {
      state.data = initialState.data;
      state.opponentStatus = 'waiting';
      state.playerStatuses = {};
    },
  },
});

export const { setMatchData, updateTimer, setOpponentStatus, resetBattle, setPlayerConnection } = battleSlice.actions;
export default battleSlice.reducer;
