import React from 'react';
import { User, Palette, Save } from 'lucide-react';
import { avatarColors } from '../utils/avatarColors';
import { AvatarUpload } from './AvatarUpload';

export interface ProfileFormValues {
  username: string;
  bio: string;
  avatar_color: string;
  avatar_url: string;
  banner_url: string;
}

interface ProfileFormProps {
  values: ProfileFormValues;
  onChange: (v: ProfileFormValues) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  error?: string | null;
  success?: boolean;
}

export function ProfileForm({ values, onChange, onCancel, onSave, saving, error, success }: ProfileFormProps) {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Banner Image</label>
        <AvatarUpload
          type="banner"
          url={values.banner_url}
          username={values.username}
          avatarColor={values.avatar_color}
          onChange={(url) => onChange({ ...values, banner_url: url })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Profile Picture</label>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <AvatarUpload
            type="avatar"
            url={values.avatar_url}
            username={values.username}
            avatarColor={values.avatar_color}
            onChange={(url) => onChange({ ...values, avatar_url: url })}
          />
          <div className="flex-1">
            <p className="text-xs sm:text-sm text-gray-300 mb-2 text-center sm:text-left">Click the avatar to upload a custom image</p>
            <p className="text-xs text-gray-400 text-center sm:text-left">Recommended: Square image, max 5MB</p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Username</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            aria-label="username"
            value={values.username}
            onChange={(e) => onChange({ ...values, username: e.target.value })}
            className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-400"
            placeholder="Enter username"
            maxLength={30}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Bio</label>
        <textarea
          aria-label="bio"
          value={values.bio}
          onChange={(e) => onChange({ ...values, bio: e.target.value })}
          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-400 resize-none"
          placeholder="Tell us about yourself..."
          rows={2}
          maxLength={200}
        />
        <p className="text-xs text-gray-400 mt-1">{values.bio.length}/200 characters</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">
          <Palette className="inline w-4 h-4 mr-1" /> Avatar Color
        </label>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-3">
          {avatarColors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChange({ ...values, avatar_color: color })}
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 transition-all ${
                values.avatar_color === color ? 'border-white scale-110' : 'border-gray-600 hover:border-gray-400'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {success && (
        <div className="bg-green-900/50 border border-green-700 text-green-200 px-4 py-3 rounded-lg text-sm">Profile updated successfully!</div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors order-2 sm:order-1"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
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
  );
}
