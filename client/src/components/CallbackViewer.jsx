import { useState, useEffect } from 'react';
import { Trash2, RefreshCw, ChevronDown, ChevronUp, Clock, Globe } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import api from '../services/api';
import toast from 'react-hot-toast';
import socketService from '../services/socket';

SyntaxHighlighter.registerLanguage('json', json);

const CallbackViewer = ({ subdomain }) => {
  const [callbacks, setCallbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (subdomain) {
      fetchCallbacks();
      setupSocketListener();
    }

    return () => {
      socketService.off('newCallback');
    };
  }, [subdomain]);

  const setupSocketListener = () => {
    socketService.on('newCallback', (data) => {
      if (data.subdomainId === subdomain._id) {
        setCallbacks((prev) => [data.callback, ...prev]);
        toast.success('New callback received!', {
          icon: '📡',
          duration: 2000
        });
      }
    });
  };

  const fetchCallbacks = async () => {
    if (!subdomain) return;

    try {
      const response = await api.get(`/callbacks/subdomain/${subdomain._id}`);
      setCallbacks(response.data);
    } catch (error) {
      toast.error('Failed to fetch callbacks');
    } finally {
      setLoading(false);
    }
  };

  const clearCallbacks = async () => {
    if (!confirm('Are you sure you want to clear all callbacks?')) return;

    try {
      await api.delete(`/callbacks/subdomain/${subdomain._id}/clear`);
      setCallbacks([]);
      toast.success('Callbacks cleared');
    } catch (error) {
      toast.error('Failed to clear callbacks');
    }
  };

  const deleteCallback = async (id) => {
    try {
      await api.delete(`/callbacks/${id}`);
      setCallbacks(callbacks.filter(c => c._id !== id));
      toast.success('Callback deleted');
    } catch (error) {
      toast.error('Failed to delete callback');
    }
  };

  const getMethodColor = (method) => {
    const colors = {
      GET: 'text-accent-400 bg-accent-500/20',
      POST: 'text-primary-400 bg-primary-500/20',
      PUT: 'text-yellow-400 bg-yellow-500/20',
      DELETE: 'text-red-400 bg-red-500/20',
      PATCH: 'text-purple-400 bg-purple-500/20',
    };
    return colors[method] || 'text-gray-400 bg-gray-500/20';
  };

  if (!subdomain) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <Globe className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">Select a subdomain to view callbacks</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="card text-center py-8">Loading callbacks...</div>;
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">
          Callbacks for <span className="text-primary-400">{subdomain.subdomain}</span>
        </h2>
        <div className="flex gap-2">
          <button onClick={fetchCallbacks} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          {callbacks.length > 0 && (
            <button onClick={clearCallbacks} className="btn-secondary flex items-center gap-2 text-red-400">
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {callbacks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📡</div>
            <p className="text-gray-400">No callbacks received yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Waiting for incoming requests...
            </p>
          </div>
        ) : (
          callbacks.map((callback) => (
            <div
              key={callback._id}
              className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden"
            >
              <div
                className="p-4 cursor-pointer hover:bg-gray-800/70 transition-colors"
                onClick={() => setExpandedId(expandedId === callback._id ? null : callback._id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${getMethodColor(callback.method)}`}>
                      {callback.method}
                    </span>
                    <span className="font-mono text-gray-300">{callback.path}</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(callback.timestamp), { addSuffix: true })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCallback(callback._id);
                      }}
                      className="p-2 hover:bg-red-500/20 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                    {expandedId === callback._id ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </div>
              </div>

              {expandedId === callback._id && (
                <div className="border-t border-gray-700 p-4 space-y-4 bg-gray-900/50">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-400 mb-2">Request Info</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">IP Address:</span>
                        <span className="ml-2 text-gray-300">{callback.ip}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Protocol:</span>
                        <span className="ml-2 text-gray-300">{callback.protocol}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">User Agent:</span>
                        <span className="ml-2 text-gray-300 break-all">{callback.userAgent}</span>
                      </div>
                    </div>
                  </div>

                  {Object.keys(callback.headers).length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-400 mb-2">Headers</h4>
                      <SyntaxHighlighter language="json" style={atomOneDark} customStyle={{ borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                        {JSON.stringify(callback.headers, null, 2)}
                      </SyntaxHighlighter>
                    </div>
                  )}

                  {Object.keys(callback.query).length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-400 mb-2">Query Parameters</h4>
                      <SyntaxHighlighter language="json" style={atomOneDark} customStyle={{ borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                        {JSON.stringify(callback.query, null, 2)}
                      </SyntaxHighlighter>
                    </div>
                  )}

                  {callback.bodyRaw && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-400 mb-2">Request Body</h4>
                      <SyntaxHighlighter language="json" style={atomOneDark} customStyle={{ borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                        {callback.bodyRaw}
                      </SyntaxHighlighter>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CallbackViewer;
