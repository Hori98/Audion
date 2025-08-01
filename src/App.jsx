import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AudioProvider } from './contexts/AudioContext';
import AuthScreen from './components/AuthScreen';
import Layout from './components/Layout';
import FeedScreen from './components/FeedScreen';
import SourcesScreen from './components/SourcesScreen';
import LibraryScreen from './components/LibraryScreen';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('feed');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600 text-lg">Loading Audion...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'feed':
        return <FeedScreen />;
      case 'sources':
        return <SourcesScreen />;
      case 'library':
        return <LibraryScreen />;
      default:
        return <FeedScreen />;
    }
  };

  return (
    <Layout currentView={currentView} setCurrentView={setCurrentView}>
      {renderCurrentView()}
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <AudioProvider>
        <AppContent />
      </AudioProvider>
    </AuthProvider>
  );
}

export default App;