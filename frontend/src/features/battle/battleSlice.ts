import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MatchState, OpponentStatus } from '../../shared/types';

interface BattleState {
  data: MatchState;
  opponentStatus: OpponentStatus;
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
    resetBattle: (state) => {
      state.data = initialState.data;
      state.opponentStatus = 'waiting';
    },
  },
});

export const { setMatchData, updateTimer, setOpponentStatus, resetBattle } = battleSlice.actions;
export default battleSlice.reducer;
