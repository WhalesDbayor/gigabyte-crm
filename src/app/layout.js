'use client';

import { AppProvider, useApp } from '@/context/AppContext';
import '@/app/globals.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, CheckSquare, Target, Settings, Plus, LogOut, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

function LayoutShell({ children }) {
  const { user, isLoading, logout } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  // Show nothing while auth state is being determined
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, backgroundColor: '#83C326', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: 20, margin: '0 auto 12px' }}>G</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Loading…</p>
        </div>
      </div>
    );
  }

  // Login page renders without shell
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // If not logged in and not on login, show nothing (redirect handled by AppContext)
  if (!user) return null;

  return (
    <div className="app-container">
      {/* Desktop Sidebar Navigation */}
      <aside className="sidebar">
        <div style={{ marginBottom: 30, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, backgroundColor: '#83C326', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', boxShadow: '0 2px 8px rgba(131,195,38,0.4)' }}>G</div>
          <span style={{ fontWeight: 800, fontSize: 18 }}>GIGABYTE CRM</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
          <Link href="/" className={`btn btn-secondary ${pathname === '/' ? 'active' : ''}`} style={{ justifyContent: 'flex-start', border: 'none', background: pathname === '/' ? 'var(--accent-color-light)' : 'transparent', color: pathname === '/' ? 'var(--accent-color)' : 'inherit', gap: 10 }}>
            <Home size={18} /> Home
          </Link>
          <Link href="/leads" className={`btn btn-secondary ${pathname.startsWith('/leads') ? 'active' : ''}`} style={{ justifyContent: 'flex-start', border: 'none', background: pathname.startsWith('/leads') ? 'var(--accent-color-light)' : 'transparent', color: pathname.startsWith('/leads') ? 'var(--accent-color)' : 'inherit', gap: 10 }}>
            <Users size={18} /> Leads
          </Link>
          <Link href="/opportunities" className={`btn btn-secondary ${pathname.startsWith('/opportunities') ? 'active' : ''}`} style={{ justifyContent: 'flex-start', border: 'none', background: pathname.startsWith('/opportunities') ? 'var(--accent-color-light)' : 'transparent', color: pathname.startsWith('/opportunities') ? 'var(--accent-color)' : 'inherit', gap: 10 }}>
            <Target size={18} /> Opportunities
          </Link>
          <Link href="/followups" className={`btn btn-secondary ${pathname.startsWith('/followups') ? 'active' : ''}`} style={{ justifyContent: 'flex-start', border: 'none', background: pathname.startsWith('/followups') ? 'var(--accent-color-light)' : 'transparent', color: pathname.startsWith('/followups') ? 'var(--accent-color)' : 'inherit', gap: 10 }}>
            <CheckSquare size={18} /> Follow-ups
          </Link>
          <Link href="/setup" className={`btn btn-secondary ${pathname === '/setup' ? 'active' : ''}`} style={{ justifyContent: 'flex-start', border: 'none', background: pathname === '/setup' ? 'var(--accent-color-light)' : 'transparent', color: pathname === '/setup' ? 'var(--accent-color)' : 'inherit', gap: 10 }}>
            <Settings size={18} /> Setup
          </Link>
        </nav>

        {/* User info + logout — no role switcher */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--accent-color-light)', border: '1px solid var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={16} style={{ color: 'var(--accent-color)' }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{user.first_name} {user.last_name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{user.role_name}</div>
            </div>
          </div>
          <button onClick={logout} className="btn btn-secondary" style={{ height: 36, fontSize: 12, justifyContent: 'center', gap: 6 }}>
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </aside>

      {/* Main Screen Content */}
      <main className="main-content">
        {/* Mobile header bar */}
        <div className="mobile-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, backgroundColor: '#83C326', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: 14 }}>G</div>
            <span style={{ fontWeight: 800, fontSize: 16 }}>Gigabyte CRM</span>
          </div>
          {/* Only user name shown — no role switch button */}
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <UserCheck size={13} style={{ color: 'var(--accent-color)' }} />
            {user.first_name}
          </div>
        </div>

        {children}
      </main>

      {/* Mobile Floating Action Button */}
      <button onClick={() => router.push('/leads/new')} className="fab" aria-label="Add Walk-In Lead">
        <Plus size={24} />
      </button>

      {/* Mobile Bottom Tab Navigation */}
      <nav className="bottom-nav">
        <Link href="/" className={`nav-item ${pathname === '/' ? 'active' : ''}`}>
          <Home size={20} className="nav-icon" />
          <span>Home</span>
        </Link>
        <Link href="/leads" className={`nav-item ${pathname.startsWith('/leads') ? 'active' : ''}`}>
          <Users size={20} className="nav-icon" />
          <span>Leads</span>
        </Link>
        <Link href="/opportunities" className={`nav-item ${pathname.startsWith('/opportunities') ? 'active' : ''}`}>
          <Target size={20} className="nav-icon" />
          <span>Pipeline</span>
        </Link>
        <Link href="/followups" className={`nav-item ${pathname.startsWith('/followups') ? 'active' : ''}`}>
          <CheckSquare size={20} className="nav-icon" />
          <span>Follow-ups</span>
        </Link>
        <Link href="/setup" className={`nav-item ${pathname === '/setup' ? 'active' : ''}`}>
          <Settings size={20} className="nav-icon" />
          <span>Setup</span>
        </Link>
      </nav>

      <style jsx global>{`
        .mobile-header-bar {
          display: flex;
        }
        @media (min-width: 768px) {
          .mobile-header-bar {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProvider>
          <LayoutShell>{children}</LayoutShell>
        </AppProvider>
      </body>
    </html>
  );
}
