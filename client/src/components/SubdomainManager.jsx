import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Trash2, Copy, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const SubdomainManager = ({ onSubdomainSelect }) => {
  const [subdomains, setSubdomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState('60');
  const baseDomain = import.meta.env.VITE_BASE_DOMAIN || 'callback.local';

  useEffect(() => {
    fetchSubdomains();
  }, []);

  const fetchSubdomains = async () => {
    try {
      const response = await api.get('/subdomains');
      setSubdomains(response.data);
    } catch (error) {
      toast.error('Failed to fetch subdomains');
    } finally {
      setLoading(false);
    }
  };

  const createRandom = async () => {
    try {
      const response = await api.post('/subdomains/random');
      setSubdomains([response.data, ...subdomains]);
      toast.success('Random subdomain created!');
    } catch (error) {
      toast.error('Failed to create subdomain');
    }
  };

  const createCustom = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/subdomains/custom', {
        subdomain: customName,
        expiryMinutes: parseInt(expiryMinutes)
      });
      setSubdomains([response.data, ...subdomains]);
      setCustomName('');
      setExpiryMinutes('60');
      setShowCustomForm(false);
      toast.success(`Custom subdomain created! Expires in ${expiryMinutes} minutes`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create subdomain');
    }
  };

  const deleteSubdomain = async (id) => {
    if (!confirm('Are you sure you want to delete this subdomain?')) return;

    try {
      await api.delete(`/subdomains/${id}`);
      setSubdomains(subdomains.filter(s => s._id !== id));
      toast.success('Subdomain deleted');
    } catch (error) {
      toast.error('Failed to delete subdomain');
    }
  };

  const toggleActive = async (id) => {
    try {
      const response = await api.patch(`/subdomains/${id}/toggle`);
      setSubdomains(subdomains.map(s => s._id === id ? response.data : s));
      toast.success('Subdomain status updated');
    } catch (error) {
      toast.error('Failed to update subdomain');
    }
  };

  const copyToClipboard = (text, protocol) => {
    navigator.clipboard.writeText(text);
    toast.success(`${protocol ? protocol.toUpperCase() + ' ' : ''}URL copied to clipboard!`);
  };

  if (loading) {
    return <div className="text-center py-8">Loading subdomains...</div>;
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Subdomains</h2>
        <div className="flex gap-2">
          <button onClick={createRandom} className="btn-primary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Random
          </button>
          <button onClick={() => setShowCustomForm(!showCustomForm)} className="btn-secondary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Custom
          </button>
        </div>
      </div>

      {showCustomForm && (
        <form onSubmit={createCustom} className="mb-6 p-4 bg-gray-900/50 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Custom Subdomain
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="input-field w-full"
              placeholder="mysubdomain"
              pattern="[a-z][a-z0-9-]{2,62}"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              3-63 characters, lowercase letters, numbers, and hyphens only
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Expiry Time (minutes)
            </label>
            <input
              type="number"
              value={expiryMinutes}
              onChange={(e) => setExpiryMinutes(e.target.value)}
              className="input-field w-full"
              placeholder="60"
              min="1"
              max="10080"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Set expiry time between 1 minute and 10080 minutes (7 days)
            </p>
          </div>

          <button type="submit" className="btn-primary w-full">
            Create Custom Subdomain
          </button>
        </form>
      )}

      <div className="space-y-3">
        {subdomains.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No subdomains yet. Create one to get started!
          </div>
        ) : (
          subdomains.map((subdomain) => {
            const fullDomain = `${subdomain.subdomain}.${baseDomain}`;
            return (
              <div
                key={subdomain._id}
                className={`p-4 rounded-lg border transition-all cursor-pointer ${
                  subdomain.isActive
                    ? 'bg-gray-800/50 border-gray-700 hover:border-primary-500'
                    : 'bg-gray-900/50 border-gray-800 opacity-60'
                }`}
                onClick={() => onSubdomainSelect(subdomain)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg text-primary-400">{fullDomain}</span>
                      {subdomain.isCustom && (
                        <span className="text-xs bg-secondary-500/20 text-secondary-400 px-2 py-1 rounded">
                          Custom
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Created {new Date(subdomain.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => copyToClipboard(`http://${fullDomain}`, 'http')}
                      className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded transition-colors flex items-center gap-1"
                      title="Copy HTTP URL"
                    >
                      <Copy className="w-3 h-3" />
                      HTTP
                    </button>
                    <button
                      onClick={() => copyToClipboard(`https://${fullDomain}`, 'https')}
                      className="px-2 py-1 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded transition-colors flex items-center gap-1"
                      title="Copy HTTPS URL"
                    >
                      <Copy className="w-3 h-3" />
                      HTTPS
                    </button>
                    <button
                      onClick={() => toggleActive(subdomain._id)}
                      className="p-2 hover:bg-gray-700 rounded transition-colors"
                      title={subdomain.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {subdomain.isActive ? (
                        <ToggleRight className="w-5 h-5 text-accent-500" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-gray-500" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteSubdomain(subdomain._id)}
                      className="p-2 hover:bg-red-500/20 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SubdomainManager;
