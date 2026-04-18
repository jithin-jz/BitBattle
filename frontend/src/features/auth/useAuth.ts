import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../app/store';
import { logout, setAuth } from './authSlice';
import { User } from '../../shared/types';

export const useAuth = () => {
  const { user, accessToken, loading, error } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout());
  };

  const updateAuth = (user: User, token: string) => {
    dispatch(setAuth({ user, accessToken: token }));
  };

  return {
    user,
    accessToken,
    loading,
    error,
    isAuthenticated: !!user,
    logout: handleLogout,
    setAuth: updateAuth
  };
};
