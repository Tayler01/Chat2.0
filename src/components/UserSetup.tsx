import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { User as UserType } from '../types/message';

interface UserSetupProps {
  onUserSet: (user: UserType) => void;
}

const avatarColors = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', 
  '#22C55E', '#06B6D4', '#3B82F6', '#6366F1', 
  '#8B5CF6', '#EC4899', '#F43F5E', '#64748B'
];

const getRandomColor = () => {
  return avatarColors[Math.floor(Math.random() * avatarColors.length)];
};

export function UserSetup({ onUserSet }: UserSetupProps) {
  const [name, setName] = useState('');
  const [isReturningUser, setIsReturningUser] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('chatUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setName(user.name || '');
        setIsReturningUser(true);
      } catch (error) {
        localStorage.removeItem('chatUser');
      }
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      const savedUser = localStorage.getItem('chatUser');
      let avatarColor = getRandomColor();
      
      if (savedUser && isReturningUser) {
        try {
          const existingUser = JSON.parse(savedUser);
          avatarColor = existingUser.avatar_color || getRandomColor();
        } catch (error) {
          avatarColor = getRandomColor();
        }
      }
      
      onUserSet({
        id: crypto.randomUUID(),
        name: name.trim(),
        avatar_color: avatarColor
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-8 w-full max-w-md backdrop-blur-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4 shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {isReturningUser ? 'Welcome Back!' : 'Join the Chat'}
          </h1>
          <p className="text-gray-300">
            {isReturningUser 
              ? 'Your profile has been restored. Click continue to start chatting.' 
              : 'Set up your profile to start messaging'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-200 mb-2">
              Your Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-400"
              placeholder="Enter your name"
              maxLength={50}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
          >
            {isReturningUser ? 'Continue Chatting' : 'Start Chatting'}
          </button>
        </form>
      </div>
    </div>
  );
}