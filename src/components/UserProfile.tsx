import React, { useState, useEffect } from 'react';
import { X, User, Mail, Palette, Save, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ChatHeader } from './ChatHeader';

type PageType = 'group-chat' | 'dms' | 'profile';

interface UserProfileProps {
  user: {
    id: string;
    email: string;
    username: string;
    avatar_color: string;
  };
  onClose: () => void;
  onUserUpdate: (updatedUser: any) => void;
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

const avatarColors = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', 
  '#22C55E', '#06B6D4', '#3B82F6', '#6366F1', 
  '#8B5CF6', '#EC4899', '#F43F5E', '#64748B'
];

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

  // Edit modal state
  const [editData, setEditData] = useState({
    username: user.username,
    bio: '',
    avatar_color: user.avatar_color,
    avatar_url: '',
    banner_url: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

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
        setEditData(profile);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editData.username.trim()) {
      setError('Username is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Check if username is taken by another user
      const { data: existingUsers } = await supabase
        .from('users')
        .select('id')
        .eq('username', editData.username.trim())
        .neq('id', user.id)
        .limit(1);

      if (existingUsers && existingUsers.length > 0) {
        throw new Error('Username is already taken');
      }

      const { error } = await supabase
        .from('users')
        .update({
          username: editData.username.trim(),
          bio: editData.bio.trim(),
          avatar_color: editData.avatar_color,
          avatar_url: editData.avatar_url.trim() || null,
          banner_url: editData.banner_url.trim() || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setProfileData({
        ...profileData,
        ...editData,
        username: editData.username.trim(),
        bio: editData.bio.trim(),
      });

      // Update the user in the parent component
      onUserUpdate({
        ...user,
        username: editData.username.trim(),
        avatar_color: editData.avatar_color,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setShowEditModal(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (file: File, type: 'avatar' | 'banner'): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${type}_${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleImageUpload = async (file: File, type: 'avatar' | 'banner') => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    try {
      if (type === 'avatar') {
        setUploadingAvatar(true);
      } else {
        setUploadingBanner(true);
      }
      
      setError(null);
      const imageUrl = await uploadImage(file, type);
      
      setEditData({
        ...editData,
        [type === 'avatar' ? 'avatar_url' : 'banner_url']: imageUrl
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to upload ${type}`);
    } finally {
      if (type === 'avatar') {
        setUploadingAvatar(false);
      } else {
        setUploadingBanner(false);
      }
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
    <div className="min-h-screen bg-gray-900">
      {/* Same header as main page */}
      <ChatHeader 
        userName={user.username}
        onClearUser={() => {}} // Empty function since we don't want to sign out from profile  
        onShowProfile={() => {}} // Empty function since we're already on profile
        currentPage={currentPage}
        onPageChange={onPageChange} // Allow navigation to other pages
      />

      {/* Main content with grid layout */}
      <div className="h-[calc(100vh-5rem)] overflow-hidden">
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
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Banner Preview & Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Banner Image
                </label>
                <div className="relative">
                  <div 
                    className="w-full h-24 sm:h-32 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border-2 border-dashed border-gray-600 hover:border-gray-400"
                    style={editData.banner_url ? { 
                      backgroundImage: `url(${editData.banner_url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      border: 'none'
                    } : {}}
                    onClick={() => document.getElementById('banner-upload')?.click()}
                  >
                    {!editData.banner_url && (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-white">
                          <Upload className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2" />
                          <p className="text-xs sm:text-sm">Click to upload banner</p>
                        </div>
                      </div>
                    )}
                    {uploadingBanner && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      </div>
                    )}
                  </div>
                  <input
                    id="banner-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, 'banner');
                    }}
                    className="hidden"
                  />
                  {editData.banner_url && (
                    <button
                      onClick={() => setEditData({ ...editData, banner_url: '' })}
                      className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Avatar Preview & Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Profile Picture
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative">
                    <div 
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border-2 border-dashed border-gray-600 hover:border-gray-400 flex items-center justify-center"
                      style={editData.avatar_url ? { border: 'none' } : {}}
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                    >
                      {editData.avatar_url ? (
                        <img
                          src={editData.avatar_url}
                          alt="Avatar preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div 
                          className="w-full h-full flex items-center justify-center text-white text-lg sm:text-xl font-bold"
                          style={{ backgroundColor: editData.avatar_color }}
                        >
                          {editData.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        </div>
                      )}
                    </div>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'avatar');
                      }}
                      className="hidden"
                    />
                    {editData.avatar_url && (
                      <button
                        onClick={() => setEditData({ ...editData, avatar_url: '' })}
                        className="absolute -top-1 -right-1 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm text-gray-300 mb-2 text-center sm:text-left">Click the avatar to upload a custom image</p>
                    <p className="text-xs text-gray-400 text-center sm:text-left">Recommended: Square image, max 5MB</p>
                  </div>
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={editData.username}
                    onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-400"
                    placeholder="Enter username"
                    maxLength={30}
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Bio
                </label>
                <textarea
                  value={editData.bio}
                  onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-400 resize-none"
                  placeholder="Tell us about yourself..."
                  rows={2}
                  maxLength={200}
                />
                <p className="text-xs text-gray-400 mt-1">{editData.bio.length}/200 characters</p>
              </div>

              {/* Avatar Color */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  <Palette className="inline w-4 h-4 mr-1" />
                  Avatar Color
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-3">
                  {avatarColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setEditData({ ...editData, avatar_color: color })}
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 transition-all ${
                        editData.avatar_color === color 
                          ? 'border-white scale-110' 
                          : 'border-gray-600 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-900/50 border border-green-700 text-green-200 px-4 py-3 rounded-lg text-sm">
                  Profile updated successfully!
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none order-1 sm:order-2"
                >
                  {saving ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Saving...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Save className="w-5 h-5" />
                      Save Changes
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}