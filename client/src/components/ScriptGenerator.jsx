import { useState, useEffect } from 'react';
import { FileCode, Copy, Trash2, Download, Clock, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import api from '../services/api';
import toast from 'react-hot-toast';

const ScriptGenerator = ({ subdomain }) => {
  const [templates, setTemplates] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState(5);
  const [loading, setLoading] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customFilename, setCustomFilename] = useState('');
  const [customContent, setCustomContent] = useState('');
  const [customFormat, setCustomFormat] = useState('txt');
  const [customExpiry, setCustomExpiry] = useState(5);
  const baseDomain = import.meta.env.VITE_BASE_DOMAIN || 'callback.local';

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (subdomain) {
      fetchScripts();
      // Auto-refresh scripts every 10 seconds
      const interval = setInterval(fetchScripts, 10000);
      return () => clearInterval(interval);
    }
  }, [subdomain]);

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/scripts/templates');
      setTemplates(response.data);
    } catch (error) {
      toast.error('Failed to fetch templates');
    }
  };

  const fetchScripts = async () => {
    if (!subdomain) return;

    try {
      const response = await api.get(`/scripts/subdomain/${subdomain._id}`);
      setScripts(response.data);
    } catch (error) {
      console.error('Failed to fetch scripts:', error);
    }
  };

  const generateScript = async () => {
    if (!selectedTemplate || !selectedFormat) {
      toast.error('Please select template and format');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/scripts/generate', {
        subdomainId: subdomain._id,
        template: selectedTemplate,
        fileFormat: selectedFormat,
        expiryMinutes: expiryMinutes
      });
      setScripts([response.data, ...scripts]);
      toast.success(`Script generated! Expires in ${expiryMinutes} minutes`);
    } catch (error) {
      toast.error('Failed to generate script');
    } finally {
      setLoading(false);
    }
  };

  const createCustomScript = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/scripts/custom', {
        subdomainId: subdomain._id,
        filename: customFilename,
        content: customContent,
        fileFormat: customFormat,
        expiryMinutes: customExpiry
      });
      setScripts([response.data, ...scripts]);
      setCustomFilename('');
      setCustomContent('');
      setShowCustomForm(false);
      toast.success(`Custom script created! Expires in ${customExpiry} minutes`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create script');
    } finally {
      setLoading(false);
    }
  };

  const deleteScript = async (id) => {
    try {
      await api.delete(`/scripts/${id}`);
      setScripts(scripts.filter(s => s._id !== id));
      toast.success('Script deleted');
    } catch (error) {
      toast.error('Failed to delete script');
    }
  };

  const copyUrl = (filename, protocol = 'https') => {
    const url = `${protocol}://${subdomain.subdomain}.${baseDomain}/script/${filename}`;
    navigator.clipboard.writeText(url);
    toast.success(`${protocol.toUpperCase()} URL copied to clipboard!`);
  };

  const copyContent = (content) => {
    navigator.clipboard.writeText(content);
    toast.success('Content copied to clipboard!');
  };

  const downloadScript = (filename, content) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Script downloaded!');
  };

  const getTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;

    if (diff <= 0) return 'Expired';

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!subdomain) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <FileCode className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">Select a subdomain to generate scripts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Script Generator</h2>
        <button
          onClick={() => setShowCustomForm(!showCustomForm)}
          className="btn-secondary"
        >
          Custom Script
        </button>
      </div>

      {/* Template Generator */}
      <div className="mb-6 p-4 bg-gray-900/50 rounded-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Template Category
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => {
                setSelectedTemplate(e.target.value);
                setSelectedFormat('');
              }}
              className="input-field w-full"
            >
              <option value="">Select category...</option>
              {templates.map((t) => (
                <option key={t.category} value={t.category}>
                  {t.category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              File Format
            </label>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="input-field w-full"
              disabled={!selectedTemplate}
            >
              <option value="">Select format...</option>
              {selectedTemplate &&
                templates
                  .find((t) => t.category === selectedTemplate)
                  ?.formats.map((format) => (
                    <option key={format} value={format}>
                      .{format}
                    </option>
                  ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Expiry (minutes)
            </label>
            <input
              type="number"
              value={expiryMinutes}
              onChange={(e) => setExpiryMinutes(parseInt(e.target.value) || 5)}
              min="1"
              max="1440"
              className="input-field w-full"
              title="1 minute to 1440 minutes (24 hours)"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={generateScript}
              disabled={!selectedTemplate || !selectedFormat || loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          💡 Expiry range: 1 minute to 1440 minutes (24 hours)
        </div>
      </div>

      {/* Custom Script Form */}
      {showCustomForm && (
        <form onSubmit={createCustomScript} className="mb-6 p-4 bg-gray-900/50 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Filename (e.g., myfile.php)
            </label>
            <input
              type="text"
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              className="input-field w-full"
              placeholder="myfile.php"
              pattern="[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Content
            </label>
            <textarea
              value={customContent}
              onChange={(e) => setCustomContent(e.target.value)}
              className="input-field w-full font-mono"
              rows="8"
              placeholder="<?php echo 'Hello World'; ?>"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                File Format Extension
              </label>
              <input
                type="text"
                value={customFormat}
                onChange={(e) => setCustomFormat(e.target.value)}
                className="input-field w-full"
                placeholder="php"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Expiry (minutes)
              </label>
              <input
                type="number"
                value={customExpiry}
                onChange={(e) => setCustomExpiry(parseInt(e.target.value) || 5)}
                min="1"
                max="1440"
                className="input-field w-full"
                title="1 minute to 1440 minutes (24 hours)"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating...' : 'Create Custom Script'}
          </button>
        </form>
      )}

      {/* Generated Scripts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Generated Scripts</h3>
          <button onClick={fetchScripts} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {scripts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No scripts generated yet
          </div>
        ) : (
          scripts.map((script) => {
            const httpUrl = `http://${subdomain.subdomain}.${baseDomain}/script/${script.filename}`;
            const httpsUrl = `https://${subdomain.subdomain}.${baseDomain}/script/${script.filename}`;
            const timeRemaining = getTimeRemaining(script.expiresAt);
            const isExpired = timeRemaining === 'Expired';

            return (
              <div
                key={script._id}
                className={`bg-gray-800/50 border rounded-lg overflow-hidden ${
                  isExpired ? 'border-red-500/50 opacity-60' : 'border-gray-700'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <FileCode className="w-5 h-5 text-primary-400" />
                      <div>
                        <div className="font-mono text-sm text-white">{script.filename}</div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span>Template: {script.template}</span>
                          <span>Accessed: {script.accessCount} times</span>
                          <span className={`flex items-center gap-1 ${isExpired ? 'text-red-400' : ''}`}>
                            <Clock className="w-3 h-3" />
                            {isExpired ? 'Expired' : `Expires in ${timeRemaining}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyContent(script.content)}
                        className="p-2 hover:bg-gray-700 rounded transition-colors"
                        title="Copy Content"
                      >
                        <FileCode className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => downloadScript(script.filename, script.content)}
                        className="p-2 hover:bg-gray-700 rounded transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteScript(script._id)}
                        className="p-2 hover:bg-red-500/20 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* Script URLs - Both HTTP and HTTPS */}
                  <div className="space-y-2 mb-3">
                    <div className="text-xs text-gray-400 mb-1">Script URLs (choose your protocol):</div>

                    {/* HTTP URL */}
                    <div className="flex items-center gap-2 bg-gray-900/80 p-2 rounded border border-gray-700">
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-semibold">HTTP</span>
                      <div className="flex-1 font-mono text-xs text-gray-300 break-all">{httpUrl}</div>
                      <button
                        onClick={() => copyUrl(script.filename, 'http')}
                        className="p-1.5 hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                        title="Copy HTTP URL"
                        disabled={isExpired}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* HTTPS URL */}
                    <div className="flex items-center gap-2 bg-gray-900/80 p-2 rounded border border-gray-700">
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-semibold">HTTPS</span>
                      <div className="flex-1 font-mono text-xs text-gray-300 break-all">{httpsUrl}</div>
                      <button
                        onClick={() => copyUrl(script.filename, 'https')}
                        className="p-1.5 hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                        title="Copy HTTPS URL"
                        disabled={isExpired}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-gray-400 hover:text-white">
                      View Content
                    </summary>
                    <div className="mt-2">
                      <SyntaxHighlighter
                        language="text"
                        style={atomOneDark}
                        customStyle={{ borderRadius: '0.5rem', fontSize: '0.75rem', maxHeight: '300px' }}
                      >
                        {script.content}
                      </SyntaxHighlighter>
                    </div>
                  </details>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <p className="text-xs text-yellow-400">
          ⚠️ Scripts auto-expire based on your custom expiry setting (1 min - 24 hours)
        </p>
      </div>
    </div>
  );
};

export default ScriptGenerator;
