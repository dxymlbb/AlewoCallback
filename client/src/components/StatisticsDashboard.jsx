import { useState, useEffect } from 'react';
import { Activity, Globe, FileCode, TrendingUp } from 'lucide-react';
import api from '../services/api';

const StatisticsDashboard = () => {
  const [stats, setStats] = useState({
    totalSubdomains: 0,
    activeSubdomains: 0,
    totalInteractions: 0,
    httpRequests: 0,
    dnsQueries: 0,
    totalScripts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [subdomainsRes, interactionsRes] = await Promise.all([
        api.get('/subdomains'),
        api.get('/interactions')
      ]);

      const subdomains = subdomainsRes.data;
      const interactions = interactionsRes.data;

      setStats({
        totalSubdomains: subdomains.length,
        activeSubdomains: subdomains.filter(s => s.isActive).length,
        totalInteractions: interactions.length,
        httpRequests: interactions.filter(i => i.type === 'HTTP').length,
        dnsQueries: interactions.filter(i => i.type === 'DNS').length,
        totalScripts: 0 // Will be calculated per subdomain
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, color }) => {
    // Color mapping untuk Tailwind - dynamic classes tidak bekerja dengan Tailwind purge
    const colorClasses = {
      primary: {
        bg: 'bg-primary-500/20',
        text: 'text-primary-400',
        iconText: 'text-primary-400'
      },
      accent: {
        bg: 'bg-accent-500/20',
        text: 'text-accent-400',
        iconText: 'text-accent-400'
      },
      secondary: {
        bg: 'bg-secondary-500/20',
        text: 'text-secondary-400',
        iconText: 'text-secondary-400'
      },
      green: {
        bg: 'bg-green-500/20',
        text: 'text-green-400',
        iconText: 'text-green-400'
      }
    };

    const colors = colorClasses[color] || colorClasses.primary;

    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 hover:border-primary-500/50 transition-all">
        <div className="flex items-center justify-between mb-2">
          <div className={`w-12 h-12 rounded-lg ${colors.bg} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${colors.iconText}`} />
          </div>
          <div className={`text-3xl font-bold ${colors.text}`}>
            {loading ? '...' : value.toLocaleString()}
          </div>
        </div>
        <div className="text-sm text-gray-400 mt-2">{label}</div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard
        icon={Globe}
        label="Total Subdomains"
        value={stats.totalSubdomains}
        color="primary"
      />
      <StatCard
        icon={Activity}
        label="Active Subdomains"
        value={stats.activeSubdomains}
        color="accent"
      />
      <StatCard
        icon={TrendingUp}
        label="Total Interactions"
        value={stats.totalInteractions}
        color="secondary"
      />
      <StatCard
        icon={FileCode}
        label="HTTP Requests"
        value={stats.httpRequests}
        color="green"
      />
    </div>
  );
};

export default StatisticsDashboard;
