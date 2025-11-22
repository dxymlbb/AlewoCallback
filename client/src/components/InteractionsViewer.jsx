import { useState, useEffect, useCallback, useRef } from 'react';
import { Trash2, RefreshCw, ChevronDown, ChevronUp, Clock, Globe, Download, Filter, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import xml from 'react-syntax-highlighter/dist/esm/languages/hljs/xml';
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import http from 'react-syntax-highlighter/dist/esm/languages/hljs/http';
import plaintext from 'react-syntax-highlighter/dist/esm/languages/hljs/plaintext';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import api from '../services/api';
import toast from 'react-hot-toast';
import socketService from '../services/socket';
import {
  detectLanguage,
  getContentType,
  formatBodyContent,
  generateRawHttpRequest,
  generateRawHttpResponse
} from '../utils/contentTypeDetector';

SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('xml', xml);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('http', http);
SyntaxHighlighter.registerLanguage('text', plaintext);

const InteractionsViewer = ({ subdomain }) => {
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('N/A');
  const [viewMode, setViewMode] = useState({}); // Track view mode per interaction: 'raw' or 'parsed'

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!subdomain || !subdomain.expiresAt) return 'N/A';
    const now = new Date();
    const expires = new Date(subdomain.expiresAt);
    const diff = expires - now;

    if (diff <= 0) return 'Expired';

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Create stable callback references using useCallback
  const handleNewCallback = useCallback((data) => {
    if (subdomain && data.subdomainId === subdomain._id) {
      setInteractions((prev) => [{ ...data.callback, type: 'HTTP' }, ...prev]);
      toast.success('New HTTP request received!', {
        icon: '🌐',
        duration: 2000
      });
    }
  }, [subdomain]);

  const handleNewDNSQuery = useCallback((data) => {
    if (subdomain && data.subdomainId === subdomain._id) {
      setInteractions((prev) => [{ ...data.query, type: 'DNS' }, ...prev]);
      toast.success('New DNS query received!', {
        icon: '📡',
        duration: 2000
      });
    }
  }, [subdomain]);

  useEffect(() => {
    if (subdomain) {
      fetchInteractions();

      // Register socket listeners with stable callback references
      socketService.on('newCallback', handleNewCallback);
      socketService.on('newDNSQuery', handleNewDNSQuery);
    }

    // Cleanup: remove listeners dengan callback references yang sama
    return () => {
      socketService.off('newCallback', handleNewCallback);
      socketService.off('newDNSQuery', handleNewDNSQuery);
    };
  }, [subdomain, handleNewCallback, handleNewDNSQuery]);

  // Timer for expiry countdown
  useEffect(() => {
    if (!subdomain) {
      setTimeRemaining('N/A');
      return;
    }

    // Initial update
    setTimeRemaining(getTimeRemaining());

    // Update every second
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [subdomain]);

  const fetchInteractions = async () => {
    if (!subdomain) return;

    try {
      const response = await api.get(`/interactions/subdomain/${subdomain._id}`);
      setInteractions(response.data);
    } catch (error) {
      toast.error('Failed to fetch interactions');
    } finally {
      setLoading(false);
    }
  };

  const clearInteractions = async () => {
    if (!confirm('Are you sure you want to clear all interactions?')) return;

    try {
      await api.delete(`/interactions/subdomain/${subdomain._id}/clear`);
      setInteractions([]);
      toast.success('Interactions cleared');
    } catch (error) {
      toast.error('Failed to clear interactions');
    }
  };

  const exportInteractions = async (format) => {
    try {
      const response = await api.get(`/interactions/subdomain/${subdomain._id}/export?format=${format}`, {
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      if (format === 'csv') {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${subdomain.subdomain}-interactions.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        const dataStr = JSON.stringify(response.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${subdomain.subdomain}-interactions.json`;
        link.click();
      }

      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export interactions');
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

  const getTypeColor = (type) => {
    return type === 'DNS' ? 'text-blue-400 bg-blue-500/20' : 'text-green-400 bg-green-500/20';
  };

  const filteredInteractions = interactions.filter(item => {
    // Filter by type
    if (filterType !== 'ALL' && item.type !== filterType) return false;

    // Filter by search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (item.type === 'HTTP') {
        return (
          item.path?.toLowerCase().includes(search) ||
          item.method?.toLowerCase().includes(search) ||
          item.ip?.toLowerCase().includes(search) ||
          item.userAgent?.toLowerCase().includes(search)
        );
      } else {
        return (
          item.query?.toLowerCase().includes(search) ||
          item.sourceIP?.toLowerCase().includes(search) ||
          item.type?.toLowerCase().includes(search)
        );
      }
    }

    return true;
  });

  if (!subdomain) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <Globe className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">Select a subdomain to view interactions</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="card text-center py-8">Loading interactions...</div>;
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Interactions for <span className="text-primary-400">{subdomain.subdomain}</span>
          </h2>
          <div className="flex items-center gap-3 mt-2 text-sm">
            <span className={`flex items-center gap-1 ${timeRemaining === 'Expired' || timeRemaining.startsWith('0:') ? 'text-red-400' : 'text-gray-400'}`}>
              <Clock className="w-4 h-4" />
              {timeRemaining === 'Expired' ? 'Expired' : `Expires in ${timeRemaining}`}
            </span>
            <span className="text-gray-500">|</span>
            <span className="text-gray-400">{filteredInteractions.length} interactions</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary flex items-center gap-2">
            <Filter className="w-4 h-4" />
            {showFilters ? 'Hide' : 'Filter'}
          </button>
          <div className="relative group">
            <button className="btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
            <div className="absolute right-0 mt-2 w-32 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => exportInteractions('json')}
                className="block w-full text-left px-4 py-2 hover:bg-gray-700 text-sm"
              >
                JSON
              </button>
              <button
                onClick={() => exportInteractions('csv')}
                className="block w-full text-left px-4 py-2 hover:bg-gray-700 text-sm"
              >
                CSV
              </button>
            </div>
          </div>
          <button onClick={fetchInteractions} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          {interactions.length > 0 && (
            <button onClick={clearInteractions} className="btn-secondary flex items-center gap-2 text-red-400">
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-4 p-4 bg-gray-900/50 rounded-lg space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search interactions..."
              className="input-field w-full pl-10"
            />
          </div>
          <div className="flex gap-2">
            {['ALL', 'HTTP', 'DNS'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  filterType === type
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filteredInteractions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📡</div>
            <p className="text-gray-400">No interactions received yet</p>
            <p className="text-sm text-gray-500 mt-2">
              {searchTerm || filterType !== 'ALL' ? 'Try adjusting your filters' : 'Waiting for incoming requests...'}
            </p>
          </div>
        ) : (
          filteredInteractions.map((item) => (
            <div
              key={item._id}
              className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden"
            >
              <div
                className="p-4 cursor-pointer hover:bg-gray-800/70 transition-colors"
                onClick={() => setExpandedId(expandedId === item._id ? null : item._id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getTypeColor(item.type)}`}>
                      {item.type}
                    </span>
                    {item.type === 'HTTP' ? (
                      <>
                        <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${getMethodColor(item.method)}`}>
                          {item.method}
                        </span>
                        <span className="font-mono text-gray-300">{item.path}</span>
                      </>
                    ) : (
                      <>
                        <span className="px-3 py-1 rounded-lg text-sm font-semibold bg-purple-500/20 text-purple-400">
                          {item.queryType || 'UNKNOWN'}
                        </span>
                        <span className="font-mono text-gray-300 text-sm">{item.query}</span>
                      </>
                    )}
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </span>
                  </div>

                  {expandedId === item._id ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </div>
              </div>

              {expandedId === item._id && (
                <div className="border-t border-gray-700 p-4 space-y-4 bg-gray-900/50">
                  {item.type === 'HTTP' ? (
                    // HTTP Request Details
                    <>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">Request Info</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">IP Address:</span>
                            <span className="ml-2 text-gray-300">{item.ip}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Protocol:</span>
                            <span className="ml-2 text-gray-300">{item.protocol}</span>
                          </div>
                          {item.geolocation && (item.geolocation.country || item.geolocation.city) && (
                            <>
                              <div>
                                <span className="text-gray-500">Location:</span>
                                <span className="ml-2 text-gray-300">
                                  {item.geolocation.country && (
                                    <span className="mr-1">
                                      {item.geolocation.country.toUpperCase().replace(/./g, char =>
                                        String.fromCodePoint(127397 + char.charCodeAt())
                                      )}
                                    </span>
                                  )}
                                  {[item.geolocation.city, item.geolocation.region, item.geolocation.country]
                                    .filter(Boolean)
                                    .join(', ')}
                                </span>
                              </div>
                              {item.geolocation.ll && item.geolocation.ll.length === 2 && (
                                <div>
                                  <span className="text-gray-500">Coordinates:</span>
                                  <span className="ml-2 text-gray-300 font-mono">
                                    {item.geolocation.ll[0]}, {item.geolocation.ll[1]}
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                          <div className="col-span-2">
                            <span className="text-gray-500">User Agent:</span>
                            <span className="ml-2 text-gray-300 break-all">{item.userAgent}</span>
                          </div>
                        </div>
                      </div>

                      {/* Raw/Parsed View Toggle */}
                      <div className="flex items-center gap-2 mb-3">
                        <button
                          onClick={() => setViewMode({ ...viewMode, [item._id]: 'raw' })}
                          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                            (viewMode[item._id] || 'raw') === 'raw'
                              ? 'bg-primary-500 text-white'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          Raw HTTP
                        </button>
                        <button
                          onClick={() => setViewMode({ ...viewMode, [item._id]: 'parsed' })}
                          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                            viewMode[item._id] === 'parsed'
                              ? 'bg-primary-500 text-white'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          Parsed
                        </button>
                      </div>

                      {/* Raw HTTP Request View */}
                      {(viewMode[item._id] || 'raw') === 'raw' && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-400 mb-2">Raw HTTP Request</h4>
                          <SyntaxHighlighter language="http" style={atomOneDark} customStyle={{ borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                            {generateRawHttpRequest(item)}
                          </SyntaxHighlighter>
                        </div>
                      )}

                      {/* Parsed View */}
                      {viewMode[item._id] === 'parsed' && (
                        <>
                          {Object.keys(item.headers || {}).length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-400 mb-2">Headers</h4>
                              <SyntaxHighlighter language="json" style={atomOneDark} customStyle={{ borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                                {JSON.stringify(item.headers, null, 2)}
                              </SyntaxHighlighter>
                            </div>
                          )}

                          {Object.keys(item.query || {}).length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-400 mb-2">Query Parameters</h4>
                              <SyntaxHighlighter language="json" style={atomOneDark} customStyle={{ borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                                {JSON.stringify(item.query, null, 2)}
                              </SyntaxHighlighter>
                            </div>
                          )}

                          {item.bodyRaw && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-400 mb-2">
                                Request Body
                                <span className="ml-2 text-xs text-gray-500">
                                  ({getContentType(item.headers) || 'unknown content-type'})
                                </span>
                              </h4>
                              <SyntaxHighlighter
                                language={detectLanguage(getContentType(item.headers), item.bodyRaw)}
                                style={atomOneDark}
                                customStyle={{ borderRadius: '0.5rem', fontSize: '0.875rem' }}
                              >
                                {formatBodyContent(item.bodyRaw, getContentType(item.headers))}
                              </SyntaxHighlighter>
                            </div>
                          )}
                        </>
                      )}

                      {/* Response Section */}
                      {item.response && (
                        <div className="border-t border-gray-700 pt-4 mt-4">
                          <h4 className="text-sm font-semibold text-primary-400 mb-3 flex items-center gap-2">
                            <span className="text-lg">↩️</span>
                            Response Sent to Client
                          </h4>

                          <div className="space-y-3">
                            {/* Response Status */}
                            <div>
                              <span className="text-gray-500 text-sm">Status:</span>
                              <span className={`ml-2 px-3 py-1 rounded-lg text-sm font-semibold ${
                                item.response.statusCode >= 200 && item.response.statusCode < 300
                                  ? 'bg-green-500/20 text-green-400'
                                  : item.response.statusCode >= 400
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {item.response.statusCode} {item.response.statusMessage}
                              </span>
                            </div>

                            {/* Raw HTTP Response View */}
                            {(viewMode[item._id] || 'raw') === 'raw' && (
                              <div>
                                <h5 className="text-sm font-semibold text-gray-400 mb-2">Raw HTTP Response</h5>
                                <SyntaxHighlighter language="http" style={atomOneDark} customStyle={{ borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                                  {generateRawHttpResponse(item.response)}
                                </SyntaxHighlighter>
                              </div>
                            )}

                            {/* Parsed Response View */}
                            {viewMode[item._id] === 'parsed' && (
                              <>
                                {/* Response Headers */}
                                {item.response.headers && Object.keys(item.response.headers).length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-gray-400 mb-2">Response Headers</h5>
                                    <SyntaxHighlighter language="json" style={atomOneDark} customStyle={{ borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                                      {JSON.stringify(item.response.headers, null, 2)}
                                    </SyntaxHighlighter>
                                  </div>
                                )}

                                {/* Response Body */}
                                {item.response.bodyRaw && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-gray-400 mb-2">
                                      Response Body
                                      <span className="ml-2 text-xs text-gray-500">
                                        ({getContentType(item.response.headers) || 'unknown content-type'})
                                      </span>
                                    </h5>
                                    <SyntaxHighlighter
                                      language={detectLanguage(getContentType(item.response.headers), item.response.bodyRaw)}
                                      style={atomOneDark}
                                      customStyle={{ borderRadius: '0.5rem', fontSize: '0.875rem' }}
                                    >
                                      {formatBodyContent(item.response.bodyRaw, getContentType(item.response.headers))}
                                    </SyntaxHighlighter>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    // DNS Query Details
                    <>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">DNS Query Info</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Query:</span>
                            <span className="ml-2 text-gray-300 font-mono">{item.query}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Query Type:</span>
                            <span className="ml-2 text-gray-300 font-semibold">{item.queryType || 'UNKNOWN'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Source IP:</span>
                            <span className="ml-2 text-gray-300">{item.sourceIP}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Response:</span>
                            <span className="ml-2 text-gray-300">{item.response || 'N/A'}</span>
                          </div>
                          {item.geolocation && (item.geolocation.country || item.geolocation.city) && (
                            <>
                              <div>
                                <span className="text-gray-500">Location:</span>
                                <span className="ml-2 text-gray-300">
                                  {item.geolocation.country && (
                                    <span className="mr-1">
                                      {item.geolocation.country.toUpperCase().replace(/./g, char =>
                                        String.fromCodePoint(127397 + char.charCodeAt())
                                      )}
                                    </span>
                                  )}
                                  {[item.geolocation.city, item.geolocation.region, item.geolocation.country]
                                    .filter(Boolean)
                                    .join(', ')}
                                </span>
                              </div>
                              {item.geolocation.ll && item.geolocation.ll.length === 2 && (
                                <div>
                                  <span className="text-gray-500">Coordinates:</span>
                                  <span className="ml-2 text-gray-300 font-mono">
                                    {item.geolocation.ll[0]}, {item.geolocation.ll[1]}
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                          <div className="col-span-2">
                            <span className="text-gray-500">Timestamp:</span>
                            <span className="ml-2 text-gray-300">{new Date(item.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </>
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

export default InteractionsViewer;
