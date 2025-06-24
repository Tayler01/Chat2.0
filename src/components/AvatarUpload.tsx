import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';

interface AvatarUploadProps {
  type: 'avatar' | 'banner';
  url: string;
  username?: string;
  avatarColor?: string;
  onChange: (url: string) => void;
}

export function AvatarUpload({ type, url, username = '', avatarColor = '#3B82F6', onChange }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = async (file: File): Promise<string> => {
    const { supabase } = await import('../lib/supabase');
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { error } = await supabase.storage
      .from('images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      const imageUrl = await uploadImage(file);
      onChange(imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative">
      <div
        className={
          type === 'avatar'
            ? 'w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border-2 border-dashed border-gray-600 hover:border-gray-400 flex items-center justify-center'
            : 'w-full h-24 sm:h-32 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border-2 border-dashed border-gray-600 hover:border-gray-400'
        }
        style={url ? { backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center', border: 'none' } : {}}
        onClick={() => document.getElementById(`${type}-upload-input`)?.click()}
      >
        {!url && (
          type === 'avatar' ? (
            <div className="w-full h-full flex items-center justify-center text-white text-lg sm:text-xl font-bold" style={{ backgroundColor: avatarColor }}>
              {username.charAt(0).toUpperCase()}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-white text-center">
              <div>
                <Upload className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2" />
                <p className="text-xs sm:text-sm">Click to upload {type}</p>
              </div>
            </div>
          )
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
          </div>
        )}
      </div>
      <input
        id={`${type}-upload-input`}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      {url && !uploading && (
        <button
          type="button"
          onClick={() => onChange('')}
          className={
            type === 'avatar'
              ? 'absolute -top-1 -right-1 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors'
              : 'absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors'
          }
        >
          <X className="w-3 h-3" />
        </button>
      )}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
