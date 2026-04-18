import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import battleReducer from '../features/battle/battleSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    battle: battleReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
