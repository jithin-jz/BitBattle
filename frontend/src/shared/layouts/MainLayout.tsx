import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import { logout } from '../../features/auth/authSlice';

export default function MainLayout() {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-lc-bg text-lc-text-primary flex flex-col font-sans">
      <header className="h-14 border-b border-lc-border bg-lc-surface sticky top-0 z-50 px-4">
        <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/lobby" className="flex items-center gap-2">
              <div className="w-2 h-8 bg-lc-orange rounded-full"></div>
              <span className="text-xl font-bold tracking-tight">CodeBattle</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/lobby"
                className={`px-4 py-2 text-sm font-medium transition-colors hover:text-lc-orange ${location.pathname === '/lobby' ? 'text-lc-orange' : 'text-lc-text-secondary'}`}
              >
                Arena
              </Link>
              <Link
                to="/leaderboard"
                className={`px-4 py-2 text-sm font-medium transition-colors hover:text-lc-orange ${location.pathname === '/leaderboard' ? 'text-lc-orange' : 'text-lc-text-secondary'}`}
              >
                Leaderboard
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-lc-surface-elevated rounded-full border border-lc-border">
              <span className="text-[10px] font-bold text-lc-orange uppercase">ELO</span>
              <span className="text-sm font-bold">{user?.rating || 1200}</span>
            </div>

            <div className="h-8 w-[1px] bg-lc-border mx-2"></div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold leading-none">{user?.username || 'Guest'}</div>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs font-medium text-lc-text-muted hover:text-lc-orange transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
