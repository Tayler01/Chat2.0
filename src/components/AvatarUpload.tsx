import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { AvatarImage } from './AvatarImage';

interface AvatarUploadProps {
  userId: string;
  type: 'avatar' | 'banner';
  imageUrl?: string;
  avatarColor?: string;
  username?: string;
  onChange: (url: string) => void;
}

export function AvatarUpload({
  userId,
  type,
  imageUrl = '',
  avatarColor,
  username,
  onChange,
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File): Promise<string> => {
    const { supabase } = await import('../lib/supabase');
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${type}_${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage
      .from('images')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleFileChange = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;

    try {
      setUploading(true);
      const url = await uploadImage(file);
      onChange(url);
    } finally {
      setUploading(false);
    }
  };

  const inputId = `${type}-upload`;

  return (
    <div className="relative">
      {type === 'banner' ? (
        <div
          className="w-full h-24 sm:h-32 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border-2 border-dashed border-gray-600 hover:border-gray-400"
          style={imageUrl ? {
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: 'none'
          } : {}}
          onClick={() => document.getElementById(inputId)?.click()}
        >
          {!imageUrl && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-white">
                <Upload className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2" />
                <p className="text-xs sm:text-sm">Click to upload banner</p>
              </div>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}
        </div>
      ) : (
        <div
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border-2 border-dashed border-gray-600 hover:border-gray-400 flex items-center justify-center"
          style={imageUrl ? { border: 'none' } : {}}
          onClick={() => document.getElementById(inputId)?.click()}
        >
          <AvatarImage
            src={imageUrl}
            alt="Avatar preview"
            className="w-full h-full object-cover"
            fallbackColor={avatarColor}
            fallbackText={username?.charAt(0).toUpperCase() || '?'}
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          )}
        </div>
      )}
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileChange(file);
        }}
      />
      {imageUrl && (
        <button
          onClick={() => onChange('')}
          className={`absolute ${type === 'banner' ? 'top-2 right-2' : '-top-1 -right-1'} p-1 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors`}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
