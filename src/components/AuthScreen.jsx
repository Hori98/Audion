import React, { useState } from 'react';
import { Volume2, Mail, Lock, User, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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

    const action = isLogin ? login : register;
    const result = await action(email, password);

    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Branding */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-2xl mb-4 shadow-lg">
            <Volume2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Audion</h1>
          <p className="text-gray-600 flex items-center justify-center space-x-1">
            <Sparkles className="h-4 w-4 text-primary-500" />
            <span>Your personalized audio news</span>
          </p>
        </div>

        {/* Auth Form */}
        <div className="card animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                {isLogin ? 'Welcome back' : 'Create account'}
              </h2>
              <p className="text-gray-600">
                {isLogin 
                  ? 'Sign in to access your personalized audio news'
                  : 'Join Audion to start creating your audio news experience'
                }
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-10"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-10"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
                </div>
              ) : (
                isLogin ? 'Sign in' : 'Create account'
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors duration-200"
              >
                {isLogin 
                  ? "Don't have an account? Sign up" 
                  : 'Already have an account? Sign in'
                }
              </button>
            </div>
          </form>
        </div>

        {/* Features Preview */}
        <div className="mt-8 text-center animate-fade-in">
          <p className="text-gray-500 text-sm mb-4">What you'll get with Audion:</p>
          <div className="flex justify-center space-x-6 text-xs text-gray-600">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
              <span>AI-powered summaries</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
              <span>Custom RSS feeds</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
              <span>Audio generation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;