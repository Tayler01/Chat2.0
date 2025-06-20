import React, { useState, useEffect } from 'react';
import { X, Mail, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProfilePreviewModalProps {
  userId: string;
  onClose: () => void;
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  bio: string;
  avatar_color: string;
  avatar_url: string;
  banner_url: string;
  created_at: string;
}

export function ProfilePreviewModal({ userId, onClose }: ProfilePreviewModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('users')
        .select('id, username, email, bio, avatar_color, avatar_url, banner_url, created_at')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setProfile(data);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const formatJoinDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden mx-4">
        {/* Close button */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onClose}
            className="p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        ) : profile ? (
          <>
            {/* Banner */}
            <div 
              className="h-24 sm:h-32 bg-cover bg-center relative bg-gradient-to-r from-blue-600 to-purple-600"
              style={profile.banner_url ? { 
                backgroundImage: `url(${profile.banner_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              } : {}}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-gray-800 via-transparent to-transparent" />
            </div>

            {/* Content */}
            <div className="px-4 sm:px-6 pt-0 pb-4 sm:pb-6 relative space-y-3 sm:space-y-4">
              {/* Avatar & Basic Info */}
              <div className="flex items-end space-x-4">
                <div className="-mt-8 sm:-mt-12 w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-gray-600 ring-4 ring-gray-800 flex-shrink-0">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center text-white text-lg sm:text-xl font-bold"
                      style={{ backgroundColor: profile.avatar_color }}
                    >
                      {profile.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-bold text-white">{profile.username}</h2>
                  <p className="text-xs sm:text-sm text-gray-300 flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3" />
                    Joined {formatJoinDate(profile.created_at)}
                  </p>
                </div>
              </div>

              {/* Bio */}
              {profile.bio && (
                <div className="bg-gray-700 w-full rounded-md p-3 border border-gray-600">
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-200 mb-1">Bio</h4>
                  <p className="text-xs sm:text-sm text-gray-300 whitespace-pre-line">
                    {profile.bio}
                  </p>
                </div>
              )}

              {/* Email (if available) */}
              <div className="flex items-center space-x-3 p-2 bg-gray-700 rounded-md">
                <Mail size={14} className="text-blue-400 sm:w-4 sm:h-4" />
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs sm:text-sm font-medium text-white">Email</p>
                  <p className="text-xs text-gray-400 truncate">
                    {profile.email}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}