import React, { useState, useEffect } from 'react';
import { RefreshCw, Plus, Check, ExternalLink, Calendar, Tag, Sparkles } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

const FeedScreen = () => {
  const { token } = useAuth();
  const [articles, setArticles] = useState([]);
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/articles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setArticles(response.data);
    } catch (err) {
      setError('Failed to fetch articles. Please check your RSS sources.');
      console.error('Error fetching articles:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleArticleSelection = (articleId) => {
    setSelectedArticles(prev => 
      prev.includes(articleId)
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    );
  };

  const createAudio = async () => {
    if (selectedArticles.length === 0) {
      setError('Please select at least one article to create audio.');
      return;
    }

    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const selectedArticleData = articles.filter(article => 
        selectedArticles.includes(article.id)
      );

      const response = await axios.post(`${API_URL}/audio/create`, {
        article_ids: selectedArticles,
        article_titles: selectedArticleData.map(article => article.title),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess(`Audio created successfully: "${response.data.title}"`);
      setSelectedArticles([]);
      
      // Auto-clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create audio.');
      console.error('Error creating audio:', err);
    } finally {
      setCreating(false);
    }
  };

  const selectAll = () => {
    setSelectedArticles(articles.map(article => article.id));
  };

  const clearSelection = () => {
    setSelectedArticles([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading articles...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">News Feed</h2>
          <p className="text-gray-600">Select articles to create your personalized audio news</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchArticles}
            disabled={loading}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Selection Controls */}
      {articles.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {selectedArticles.length} of {articles.length} articles selected
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={selectAll}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Select All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={clearSelection}
                className="text-sm text-gray-600 hover:text-gray-700 font-medium"
              >
                Clear
              </button>
            </div>
          </div>
          
          {selectedArticles.length > 0 && (
            <button
              onClick={createAudio}
              disabled={creating}
              className="btn-primary flex items-center space-x-2"
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating Audio...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Create Audio ({selectedArticles.length})</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Articles Grid */}
      {articles.length === 0 ? (
        <div className="text-center py-12">
          <Radio className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
          <p className="text-gray-600 mb-6">Add some RSS sources to start seeing articles here.</p>
          <button
            onClick={() => window.location.hash = '#sources'}
            className="btn-primary"
          >
            Add RSS Sources
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => {
            const isSelected = selectedArticles.includes(article.id);
            return (
              <div
                key={article.id}
                className={`card cursor-pointer transition-all duration-200 hover:shadow-md ${
                  isSelected 
                    ? 'ring-2 ring-primary-500 bg-primary-50' 
                    : 'hover:shadow-lg'
                }`}
                onClick={() => toggleArticleSelection(article.id)}
              >
                {/* Selection Indicator */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {article.source_name}
                    </span>
                    {article.genre && (
                      <span className="text-xs font-medium text-primary-600 bg-primary-100 px-2 py-1 rounded-full flex items-center space-x-1">
                        <Tag className="h-3 w-3" />
                        <span>{article.genre}</span>
                      </span>
                    )}
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors duration-200 ${
                    isSelected 
                      ? 'bg-primary-500 border-primary-500' 
                      : 'border-gray-300 hover:border-primary-400'
                  }`}>
                    {isSelected && <Check className="h-4 w-4 text-white" />}
                  </div>
                </div>

                {/* Article Content */}
                <h3 className="font-semibold text-gray-900 mb-3 line-clamp-2 leading-tight">
                  {article.title}
                </h3>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
                  {article.summary}
                </p>

                {/* Article Meta */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {article.published 
                        ? format(new Date(article.published), 'MMM dd, yyyy')
                        : 'Unknown date'
                      }
                    </span>
                  </div>
                  
                  {article.link && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(article.link, '_blank');
                      }}
                      className="flex items-center space-x-1 text-primary-600 hover:text-primary-700 transition-colors duration-200"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Read</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FeedScreen;