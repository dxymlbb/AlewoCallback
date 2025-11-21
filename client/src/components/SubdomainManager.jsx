import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Trash2, Copy, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const SubdomainManager = ({ onSubdomainSelect }) => {
  const [subdomains, setSubdomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
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
      const response = await api.post('/subdomains/custom', { subdomain: customName });
      setSubdomains([response.data, ...subdomains]);
      setCustomName('');
      setShowCustomForm(false);
      toast.success('Custom subdomain created!');
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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
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
        <form onSubmit={createCustom} className="mb-6 p-4 bg-gray-900/50 rounded-lg">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Custom Subdomain
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="input-field flex-1"
              placeholder="mysubdomain"
              pattern="[a-z][a-z0-9-]{2,62}"
              required
            />
            <button type="submit" className="btn-primary">
              Create
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            3-63 characters, lowercase letters, numbers, and hyphens only
          </p>
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
                      onClick={() => copyToClipboard(`https://${fullDomain}`)}
                      className="p-2 hover:bg-gray-700 rounded transition-colors"
                      title="Copy URL"
                    >
                      <Copy className="w-4 h-4" />
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
