import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from './store';
import LoginPage from '../pages/LoginPage';
import LobbyPage from '../pages/LobbyPage';
import BattlePage from '../pages/BattlePage';
import LeaderboardPage from '../pages/LeaderboardPage';
import GithubCallbackPage from '../pages/GithubCallbackPage';
import MainLayout from '../shared/layouts/MainLayout';

function App() {
  const { user } = useSelector((state: RootState) => state.auth);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/lobby" />} />
        <Route path="/auth/github/callback" element={<GithubCallbackPage />} />
        
        <Route element={<MainLayout />}>
          <Route path="/lobby" element={user ? <LobbyPage /> : <Navigate to="/login" />} />
          <Route path="/leaderboard" element={user ? <LeaderboardPage /> : <Navigate to="/login" />} />
          <Route path="/battle/:matchId" element={user ? <BattlePage /> : <Navigate to="/login" />} />
        </Route>

        <Route path="/" element={<Navigate to="/lobby" />} />
      </Routes>
    </Router>
  );
}

export default App;
