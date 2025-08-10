import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Radio, ExternalLink, Calendar, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

const SourcesScreen = () => {
  const { token } = useAuth();
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSource, setNewSource] = useState({ name: '', url: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/sources`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSources(response.data);
    } catch (err) {
      setError('Failed to fetch RSS sources.');
      console.error('Error fetching sources:', err);
    } finally {
      setLoading(false);
    }
  };

  const addSource = async (e) => {
    e.preventDefault();
    if (!newSource.name.trim() || !newSource.url.trim()) {
      setError('Please provide both name and URL.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(`${API_URL}/sources`, newSource, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setSuccess('RSS source added successfully!');
      setNewSource({ name: '', url: '' });
      setShowAddForm(false);
      fetchSources();
      
      // Auto-clear success message
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add RSS source.');
      console.error('Error adding source:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteSource = async (sourceId, sourceName) => {
    if (!confirm(`Are you sure you want to delete "${sourceName}"?`)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/sources/${sourceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setSuccess('RSS source deleted successfully!');
      fetchSources();
      
      // Auto-clear success message
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete RSS source.');
      console.error('Error deleting source:', err);
    }
  };

  const validateUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading RSS sources...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">RSS Sources</h2>
          <p className="text-gray-600">Manage your news sources to customize your feed</p>
        </div>
        
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Source</span>
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Add Source Form */}
      {showAddForm && (
        <div className="card animate-slide-up">
          <form onSubmit={addSource} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add RSS Source</h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewSource({ name: '', url: '' });
                  setError('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                ×
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source Name
              </label>
              <input
                type="text"
                value={newSource.name}
                onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                className="input"
                placeholder="e.g., TechCrunch, BBC News"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RSS URL
              </label>
              <input
                type="url"
                value={newSource.url}
                onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                className="input"
                placeholder="https://example.com/rss"
                required
              />
              {newSource.url && !validateUrl(newSource.url) && (
                <p className="text-red-500 text-xs mt-1">Please enter a valid URL</p>
              )}
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={submitting || !validateUrl(newSource.url)}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Adding...</span>
                  </div>
                ) : (
                  'Add Source'
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewSource({ name: '', url: '' });
                  setError('');
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sources List */}
      {sources.length === 0 ? (
        <div className="text-center py-12">
          <Radio className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No RSS sources yet</h3>
          <p className="text-gray-600 mb-6">Add your first RSS source to start building your personalized news feed.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary"
          >
            Add Your First Source
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sources.map((source) => (
            <div key={source.id} className="card hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary-100 p-2 rounded-lg">
                    <Radio className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{source.name}</h3>
                    <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Added {format(new Date(source.created_at), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => deleteSource(source.id, source.name)}
                  className="text-gray-400 hover:text-red-500 transition-colors duration-200 p-1"
                  title="Delete source"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600 break-all">{source.url}</p>
                </div>
                
                <button
                  onClick={() => window.open(source.url, '_blank')}
                  className="w-full flex items-center justify-center space-x-2 text-sm text-primary-600 hover:text-primary-700 transition-colors duration-200"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Visit RSS Feed</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SourcesScreen;