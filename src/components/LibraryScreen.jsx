import React, { useState, useEffect } from 'react';
import { Play, Pause, Trash2, Edit3, Calendar, Clock, FileText, Download } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useAudio } from '../contexts/AudioContext';
import { format } from 'date-fns';

const LibraryScreen = () => {
  const { token } = useAuth();
  const { playAudio, currentAudio, isPlaying, pauseAudio, resumeAudio } = useAudio();
  const [audioItems, setAudioItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [showScript, setShowScript] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  useEffect(() => {
    fetchAudioLibrary();
  }, []);

  const fetchAudioLibrary = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/audio/library`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAudioItems(response.data);
    } catch (err) {
      setError('Failed to fetch audio library.');
      console.error('Error fetching audio library:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = (audioItem) => {
    if (currentAudio && currentAudio.id === audioItem.id) {
      if (isPlaying) {
        pauseAudio();
      } else {
        resumeAudio();
      }
    } else {
      playAudio(audioItem);
    }
  };

  const startEdit = (audioItem) => {
    setEditingId(audioItem.id);
    setEditTitle(audioItem.title);
  };

  const saveEdit = async (audioId) => {
    if (!editTitle.trim()) {
      setError('Title cannot be empty.');
      return;
    }

    try {
      await axios.put(`${API_URL}/audio/${audioId}/rename`, {
        new_title: editTitle.trim(),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setSuccess('Audio renamed successfully!');
      setEditingId(null);
      setEditTitle('');
      fetchAudioLibrary();
      
      // Auto-clear success message
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to rename audio.');
      console.error('Error renaming audio:', err);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const deleteAudio = async (audioId, audioTitle) => {
    if (!confirm(`Are you sure you want to delete "${audioTitle}"?`)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/audio/${audioId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setSuccess('Audio deleted successfully!');
      fetchAudioLibrary();
      
      // Auto-clear success message
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete audio.');
      console.error('Error deleting audio:', err);
    }
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const downloadAudio = (audioItem) => {
    const link = document.createElement('a');
    link.href = audioItem.audio_url;
    link.download = `${audioItem.title}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading audio library...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Audio Library</h2>
        <p className="text-gray-600">Your created audio news summaries</p>
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

      {/* Audio Items */}
      {audioItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
            <Play className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No audio created yet</h3>
          <p className="text-gray-600 mb-6">Create your first audio summary from the news feed.</p>
          <button
            onClick={() => window.location.hash = '#feed'}
            className="btn-primary"
          >
            Browse Articles
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {audioItems.map((audioItem) => {
            const isCurrentlyPlaying = currentAudio && currentAudio.id === audioItem.id && isPlaying;
            const isCurrentAudio = currentAudio && currentAudio.id === audioItem.id;
            
            return (
              <div
                key={audioItem.id}
                className={`card transition-all duration-200 ${
                  isCurrentAudio ? 'ring-2 ring-primary-500 bg-primary-50' : 'hover:shadow-md'
                }`}
              >
                <div className="flex items-start space-x-4">
                  {/* Album Art / Play Button */}
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => handlePlayPause(audioItem)}
                      className={`w-16 h-16 rounded-xl flex items-center justify-center transition-all duration-200 ${
                        isCurrentlyPlaying
                          ? 'bg-primary-500 text-white shadow-lg'
                          : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
                      }`}
                    >
                      {isCurrentlyPlaying ? (
                        <div className="flex items-center space-x-1">
                          <div className="w-1 h-4 bg-white audio-wave"></div>
                          <div className="w-1 h-4 bg-white audio-wave"></div>
                          <div className="w-1 h-4 bg-white audio-wave"></div>
                          <div className="w-1 h-4 bg-white audio-wave"></div>
                        </div>
                      ) : (
                        <Play className="h-6 w-6" />
                      )}
                    </button>
                  </div>

                  {/* Audio Info */}
                  <div className="flex-1 min-w-0">
                    {editingId === audioItem.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="input text-lg font-semibold"
                          autoFocus
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => saveEdit(audioItem.id)}
                            className="btn-primary text-sm py-1 px-3"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="btn-secondary text-sm py-1 px-3"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                          {audioItem.title}
                        </h3>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(audioItem.created_at), 'MMM dd, yyyy')}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatDuration(audioItem.duration)}</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => startEdit(audioItem)}
                            className="flex items-center space-x-1 text-sm text-gray-600 hover:text-primary-600 transition-colors duration-200"
                          >
                            <Edit3 className="h-4 w-4" />
                            <span>Rename</span>
                          </button>
                          
                          {audioItem.script && (
                            <button
                              onClick={() => setShowScript(audioItem)}
                              className="flex items-center space-x-1 text-sm text-gray-600 hover:text-primary-600 transition-colors duration-200"
                            >
                              <FileText className="h-4 w-4" />
                              <span>Script</span>
                            </button>
                          )}
                          
                          <button
                            onClick={() => downloadAudio(audioItem)}
                            className="flex items-center space-x-1 text-sm text-gray-600 hover:text-green-600 transition-colors duration-200"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download</span>
                          </button>
                          
                          <button
                            onClick={() => deleteAudio(audioItem.id, audioItem.title)}
                            className="flex items-center space-x-1 text-sm text-gray-600 hover:text-red-600 transition-colors duration-200"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Script Modal */}
      {showScript && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Audio Script</h3>
              <button
                onClick={() => setShowScript(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <h4 className="font-medium text-gray-900 mb-4">{showScript.title}</h4>
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {showScript.script || 'No script available for this audio.'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryScreen;