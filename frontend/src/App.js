import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { 
  User, 
  Plus, 
  Trash2, 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  SkipBack, 
  SkipForward, 
  Check,
  Loader,
  LogOut,
  Rss,
  Library,
  Home
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // In a real app, you'd validate the token here
      setUser({ id: token, email: 'user@example.com' });
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token } = response.data;
      setToken(access_token);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const register = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/register`, { email, password });
      const { access_token } = response.data;
      setToken(access_token);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Registration failed' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

// Login/Register Component
const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = isLogin ? await login(email, password) : await register(email, password);
    
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Volume2 className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Audion</h1>
          <p className="text-gray-600">Your personalized audio news platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              isLogin ? 'Sign In' : 'Sign Up'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-indigo-600 hover:text-indigo-700"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Navigation Component
const Navigation = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('feed');

  const tabs = [
    { id: 'feed', label: 'Feed', icon: Home, path: '/feed' },
    { id: 'sources', label: 'Sources', icon: Rss, path: '/sources' },
    { id: 'library', label: 'Library', icon: Library, path: '/library' },
  ];

  const handleNavigation = (tab) => {
    setActiveTab(tab.id);
    navigate(tab.path);
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <Volume2 className="w-8 h-8 text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-900">Audion</h1>
          </div>

          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleNavigation(tab)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === tab.id
                      ? 'text-indigo-600 bg-indigo-50'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={logout}
            className="flex items-center space-x-2 text-gray-500 hover:text-gray-700"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// RSS Sources Management
const SourcesScreen = () => {
  const [sources, setSources] = useState([]);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      const response = await axios.get(`${API}/sources`);
      setSources(response.data);
    } catch (error) {
      console.error('Error fetching sources:', error);
    }
  };

  const addSource = async (e) => {
    e.preventDefault();
    if (!newSourceName || !newSourceUrl) return;

    setLoading(true);
    try {
      await axios.post(`${API}/sources`, {
        name: newSourceName,
        url: newSourceUrl
      });
      setNewSourceName('');
      setNewSourceUrl('');
      fetchSources();
    } catch (error) {
      console.error('Error adding source:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteSource = async (sourceId) => {
    try {
      await axios.delete(`${API}/sources/${sourceId}`);
      fetchSources();
    } catch (error) {
      console.error('Error deleting source:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">News Sources</h2>
        <p className="text-gray-600">Manage your RSS feed sources</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Source</h3>
        <form onSubmit={addSource} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g., TechCrunch"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">RSS URL</label>
              <input
                type="url"
                value={newSourceUrl}
                onChange={(e) => setNewSourceUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="https://techcrunch.com/feed/"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center space-x-2"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>Add Source</span>
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {sources.map((source) => (
          <div key={source.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex justify-between items-center">
            <div>
              <h4 className="font-medium text-gray-900">{source.name}</h4>
              <p className="text-sm text-gray-500">{source.url}</p>
            </div>
            <button
              onClick={() => deleteSource(source.id)}
              className="text-red-600 hover:text-red-700 p-2"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {sources.length === 0 && (
        <div className="text-center py-12">
          <Rss className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No sources added yet. Add your first RSS feed above!</p>
        </div>
      )}
    </div>
  );
};

// Article Feed Screen
const FeedScreen = () => {
  const [articles, setArticles] = useState([]);
  const [selectedArticles, setSelectedArticles] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await axios.get(`${API}/articles`);
      setArticles(response.data);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleArticleSelection = (article) => {
    const newSelected = new Set(selectedArticles);
    const articleKey = `${article.id}-${article.title}`;
    
    if (newSelected.has(articleKey)) {
      newSelected.delete(articleKey);
    } else {
      newSelected.add(articleKey);
    }
    setSelectedArticles(newSelected);
  };

  const createAudio = async () => {
    if (selectedArticles.size === 0) return;

    setCreating(true);
    try {
      const selectedData = Array.from(selectedArticles).map(key => {
        const [id, ...titleParts] = key.split('-');
        return { id, title: titleParts.join('-') };
      });

      await axios.post(`${API}/audio/create`, {
        article_ids: selectedData.map(item => item.id),
        article_titles: selectedData.map(item => item.title)
      });

      setSelectedArticles(new Set());
      alert('Audio created successfully! Check your library.');
    } catch (error) {
      console.error('Error creating audio:', error);
      alert('Failed to create audio. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Article Feed</h2>
        <p className="text-gray-600">Select articles to create your audio summary</p>
      </div>

      {selectedArticles.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6 flex justify-between items-center">
          <div>
            <p className="font-medium text-indigo-900">
              {selectedArticles.size} article{selectedArticles.size !== 1 ? 's' : ''} selected
            </p>
          </div>
          <button
            onClick={createAudio}
            disabled={creating}
            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center space-x-2"
          >
            {creating ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Creating Audio...</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                <span>Create Audio</span>
              </>
            )}
          </button>
        </div>
      )}

      <div className="space-y-4">
        {articles.map((article) => {
          const articleKey = `${article.id}-${article.title}`;
          const isSelected = selectedArticles.has(articleKey);
          
          return (
            <div
              key={article.id}
              className={`bg-white rounded-lg shadow-sm border-2 p-6 cursor-pointer transition-all ${
                isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => toggleArticleSelection(article)}
            >
              <div className="flex items-start space-x-4">
                <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                  isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{article.title}</h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded ml-4">
                      {article.source_name}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm line-clamp-3 mb-3">{article.summary}</p>
                  
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{article.published}</span>
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Read full article →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {articles.length === 0 && (
        <div className="text-center py-12">
          <Home className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No articles found. Add some RSS sources first!</p>
        </div>
      )}
    </div>
  );
};

// Audio Library Screen
const LibraryScreen = () => {
  const [audioList, setAudioList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAudioLibrary();
  }, []);

  const fetchAudioLibrary = async () => {
    try {
      const response = await axios.get(`${API}/audio/library`);
      setAudioList(response.data);
    } catch (error) {
      console.error('Error fetching audio library:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteAudio = async (audioId) => {
    if (!window.confirm('Are you sure you want to delete this audio?')) return;

    try {
      await axios.delete(`${API}/audio/${audioId}`);
      fetchAudioLibrary();
    } catch (error) {
      console.error('Error deleting audio:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Audio Library</h2>
        <p className="text-gray-600">Your generated audio summaries</p>
      </div>

      <div className="space-y-4">
        {audioList.map((audio) => (
          <div key={audio.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{audio.title}</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Based on {audio.article_titles.length} article{audio.article_titles.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-gray-500">
                  Created on {new Date(audio.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => deleteAudio(audio.id)}
                className="text-red-600 hover:text-red-700 p-2"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Articles included:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {audio.article_titles.slice(0, 3).map((title, index) => (
                  <li key={index} className="truncate">• {title}</li>
                ))}
                {audio.article_titles.length > 3 && (
                  <li className="text-gray-500">... and {audio.article_titles.length - 3} more</li>
                )}
              </ul>
            </div>

            <AudioPlayer audioUrl={audio.audio_url} duration={audio.duration} />
          </div>
        ))}
      </div>

      {audioList.length === 0 && (
        <div className="text-center py-12">
          <Library className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No audio summaries yet. Create one from the feed!</p>
        </div>
      )}
    </div>
  );
};

// Audio Player Component
const AudioPlayer = ({ audioUrl, duration }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audio] = useState(new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.wav')); // Mock audio

  useEffect(() => {
    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audio]);

  const togglePlay = () => {
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    const rect = e.target.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center space-x-4">
        <button
          onClick={togglePlay}
          className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>

        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-sm text-gray-600">{formatTime(currentTime)}</span>
            <div 
              className="flex-1 bg-gray-300 rounded-full h-2 cursor-pointer"
              onClick={handleSeek}
            >
              <div 
                className="bg-indigo-600 h-2 rounded-full"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
            <span className="text-sm text-gray-600">{formatTime(duration)}</span>
          </div>
        </div>

        <Volume2 className="w-5 h-5 text-gray-400" />
      </div>
    </div>
  );
};

// Main App Component
const AppContent = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <Routes>
        <Route path="/" element={<Navigate to="/feed" replace />} />
        <Route path="/feed" element={<FeedScreen />} />
        <Route path="/sources" element={<SourcesScreen />} />
        <Route path="/library" element={<LibraryScreen />} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AuthWrapper />
      </BrowserRouter>
    </AuthProvider>
  );
}

const AuthWrapper = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return user ? <AppContent /> : <AuthScreen />;
};

export default App;
