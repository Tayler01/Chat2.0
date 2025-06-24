import React, { useState, useEffect } from 'react';
import { X, Mail, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ChatHeader } from './ChatHeader';
import { ProfileForm } from './ProfileForm';

type PageType = 'group-chat' | 'dms' | 'profile';

interface UserProfileProps {
  user: {
    id: string;
    email: string;
    username: string;
    avatar_color: string;
  };
  onClose: () => void;
  onUserUpdate: (updatedUser: {
    id: string;
    email?: string;
    username: string;
    avatar_color: string;
    avatar_url?: string;
    banner_url?: string;
    bio?: string;
    created_at?: string;
  }) => void;
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}


export function UserProfile({ user, onClose, onUserUpdate, currentPage, onPageChange }: UserProfileProps) {
  const [profileData, setProfileData] = useState({
    username: user.username,
    bio: '',
    avatar_color: user.avatar_color,
    avatar_url: '',
    banner_url: '',
    created_at: '',
  });
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);


  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('username, bio, avatar_color, avatar_url, banner_url, created_at')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        const profile = {
          username: data.username || user.username,
          bio: data.bio || '',
          avatar_color: data.avatar_color || user.avatar_color,
          avatar_url: data.avatar_url || '',
          banner_url: data.banner_url || '',
          created_at: data.created_at || '',
        };
        setProfileData(profile);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 relative">
      {/* Same header as main page */}
      <ChatHeader
        userName={user.username}
        onClearUser={() => {}} // Empty function since we don't want to sign out from profile
        onShowProfile={() => {}} // Empty function since we're already on profile
        currentPage={currentPage}
        onPageChange={onPageChange} // Allow navigation to other pages
      />

      {/* Back button */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Main content with grid layout */}
      <div className="h-screen overflow-hidden">
        <div className="flex justify-start px-4 sm:px-8 lg:px-16 py-4 sm:py-6 h-full">
          
          {/* Profile Card - Left side */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 flex flex-col relative overflow-hidden w-full max-w-md mx-auto sm:mx-0">
            {/* Banner */}
            <div 
              className="h-24 sm:h-32 bg-cover bg-center relative bg-gradient-to-r from-blue-600 to-purple-600"
              style={profileData.banner_url ? { 
                backgroundImage: `url(${profileData.banner_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              } : {}}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-gray-800 via-transparent to-transparent" />
            </div>

            {/* Avatar & Info */}
            <div className="px-4 sm:px-6 pt-0 pb-4 sm:pb-6 relative space-y-3 sm:space-y-4 flex-1">
              <div className="flex items-end space-x-4">
                <div className="-mt-8 sm:-mt-12 w-16 h-16 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-gray-600 ring-4 ring-gray-800 flex-shrink-0">
                  {profileData.avatar_url ? (
                    <img
                      src={profileData.avatar_url}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center text-white text-lg sm:text-2xl font-bold"
                      style={{ backgroundColor: profileData.avatar_color }}
                    >
                      {profileData.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-bold text-white">{profileData.username}</h2>
                  <p className="text-xs sm:text-sm text-gray-300 mt-1">
                    Joined {formatJoinDate(profileData.created_at)}
                  </p>
                </div>
              </div>

              {/* Bio Section */}
              <div className="bg-gray-700 w-full rounded-md p-4 border border-gray-600">
                <h4 className="text-xs sm:text-sm font-semibold text-gray-200 mb-1">Bio</h4>
                <p className="text-xs sm:text-sm text-gray-300 whitespace-pre-line">
                  {profileData.bio || 'No bio yet. Click Edit Profile to add one.'}
                </p>
              </div>

              {/* Email Info */}
              <div className="flex items-center space-x-3 p-2 bg-gray-700 rounded-md">
                <Mail size={16} className="text-blue-400 sm:w-[18px] sm:h-[18px]" />
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs sm:text-sm font-medium text-white">Email</p>
                  <p className="text-xs text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Edit Profile Button */}
            <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-3 py-2 sm:px-4 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow transition-colors"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-lg sm:text-xl font-bold text-white">Edit Profile</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

              {/* Modal Content */}
              <ProfileForm
                user={user}
                initialData={profileData}
                onCancel={() => setShowEditModal(false)}
                onSaved={(updated) => {
                  setProfileData(updated);
                  onUserUpdate({
                    ...user,
                    username: updated.username,
                    avatar_color: updated.avatar_color
                  });
                }}
              />
          </div>
        </div>
      )}
    </div>
  );
}