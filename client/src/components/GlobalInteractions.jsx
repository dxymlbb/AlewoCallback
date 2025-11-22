import { useState, useEffect } from 'react';
import { Search, Filter, Calendar, RefreshCw, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import api from '../services/api';
import toast from 'react-hot-toast';

SyntaxHighlighter.registerLanguage('json', json);

const GlobalInteractions = () => {
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchInteractions();
  }, [searchTerm, filterType, startDate, endDate]);

  const fetchInteractions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterType) params.append('type', filterType);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await api.get(`/interactions?${params.toString()}`);
      setInteractions(response.data);
    } catch (error) {
      toast.error('Failed to fetch interactions');
      console.error('Failed to fetch interactions:', error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return <div className="card text-center py-8">Loading all interactions...</div>;
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">All Interactions</h2>
          <p className="text-sm text-gray-400 mt-1">
            Viewing interactions across all subdomains
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? 'Hide' : 'Show'} Filters
          </button>
          <button onClick={fetchInteractions} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-900/50 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by IP, path, user agent..."
                className="input-field w-full pl-10"
              />
            </div>

            {/* Type Filter */}
            <div className="flex gap-2">
              {['ALL', 'HTTP', 'DNS'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type === 'ALL' ? '' : type)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    (type === 'ALL' && !filterType) || filterType === type
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Start Date
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                End Date
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-field w-full"
              />
            </div>
          </div>

          {(searchTerm || filterType || startDate || endDate) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterType('');
                setStartDate('');
                setEndDate('');
              }}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Results */}
      <div className="mb-4 text-sm text-gray-400">
        Showing {interactions.length} interaction{interactions.length !== 1 ? 's' : ''}
      </div>

      <div className="space-y-3">
        {interactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📡</div>
            <p className="text-gray-400">No interactions found</p>
            <p className="text-sm text-gray-500 mt-2">
              {searchTerm || filterType || startDate || endDate
                ? 'Try adjusting your filters'
                : 'Waiting for incoming requests...'}
            </p>
          </div>
        ) : (
          interactions.map((item) => (
            <div
              key={item._id}
              className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden"
            >
              <div
                className="p-4 cursor-pointer hover:bg-gray-800/70 transition-colors"
                onClick={() => setExpandedId(expandedId === item._id ? null : item._id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 flex-wrap">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getTypeColor(item.type)}`}>
                      {item.type}
                    </span>

                    {/* Subdomain badge */}
                    {item.subdomainId && (
                      <span className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-300">
                        {item.subdomainId.subdomain || 'Unknown'}
                      </span>
                    )}

                    {item.type === 'HTTP' ? (
                      <>
                        <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${getMethodColor(item.method)}`}>
                          {item.method}
                        </span>
                        <span className="font-mono text-gray-300 text-sm">{item.path}</span>
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

                      {item.headers && Object.keys(item.headers).length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-400 mb-2">Headers</h4>
                          <SyntaxHighlighter
                            language="json"
                            style={atomOneDark}
                            customStyle={{ borderRadius: '0.5rem', fontSize: '0.875rem' }}
                          >
                            {JSON.stringify(item.headers, null, 2)}
                          </SyntaxHighlighter>
                        </div>
                      )}

                      {item.query && Object.keys(item.query).length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-400 mb-2">Query Parameters</h4>
                          <SyntaxHighlighter
                            language="json"
                            style={atomOneDark}
                            customStyle={{ borderRadius: '0.5rem', fontSize: '0.875rem' }}
                          >
                            {JSON.stringify(item.query, null, 2)}
                          </SyntaxHighlighter>
                        </div>
                      )}

                      {item.bodyRaw && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-400 mb-2">Request Body</h4>
                          <SyntaxHighlighter
                            language="json"
                            style={atomOneDark}
                            customStyle={{ borderRadius: '0.5rem', fontSize: '0.875rem' }}
                          >
                            {item.bodyRaw}
                          </SyntaxHighlighter>
                        </div>
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

                            {/* Response Headers */}
                            {item.response.headers && Object.keys(item.response.headers).length > 0 && (
                              <div>
                                <h5 className="text-sm font-semibold text-gray-400 mb-2">Response Headers</h5>
                                <SyntaxHighlighter
                                  language="json"
                                  style={atomOneDark}
                                  customStyle={{ borderRadius: '0.5rem', fontSize: '0.875rem' }}
                                >
                                  {JSON.stringify(item.response.headers, null, 2)}
                                </SyntaxHighlighter>
                              </div>
                            )}

                            {/* Response Body */}
                            {item.response.bodyRaw && (
                              <div>
                                <h5 className="text-sm font-semibold text-gray-400 mb-2">Response Body</h5>
                                <SyntaxHighlighter
                                  language="json"
                                  style={atomOneDark}
                                  customStyle={{ borderRadius: '0.5rem', fontSize: '0.875rem' }}
                                >
                                  {item.response.bodyRaw}
                                </SyntaxHighlighter>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
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

export default GlobalInteractions;
