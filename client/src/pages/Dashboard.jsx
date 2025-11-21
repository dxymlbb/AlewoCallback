import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Shield } from 'lucide-react';
import SubdomainManager from '../components/SubdomainManager';
import InteractionsViewer from '../components/InteractionsViewer';
import ScriptGenerator from '../components/ScriptGenerator';
import socketService from '../services/socket';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [selectedSubdomain, setSelectedSubdomain] = useState(null);

  useEffect(() => {
    // Connect to socket
    const token = localStorage.getItem('token');
    if (token) {
      socketService.connect(token);
    }

    return () => {
      socketService.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="glass-effect border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
                  AlewoCallback
                </h1>
                <p className="text-xs text-gray-500">Callback Service Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">{user?.username}</span>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Floating Background Elements */}
        <div className="fixed top-20 right-20 w-96 h-96 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-float pointer-events-none"></div>
        <div className="fixed bottom-20 left-20 w-96 h-96 bg-secondary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-float pointer-events-none" style={{ animationDelay: '2s' }}></div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
          {/* Left Column */}
          <div className="space-y-6">
            <SubdomainManager onSubdomainSelect={setSelectedSubdomain} />
            <ScriptGenerator subdomain={selectedSubdomain} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <InteractionsViewer subdomain={selectedSubdomain} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
