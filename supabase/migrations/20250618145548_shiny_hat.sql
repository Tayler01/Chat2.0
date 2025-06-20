/*
  # Setup Storage Bucket and Policies for Image Uploads

  1. Storage Setup
    - Create 'images' storage bucket if it doesn't exist
    - Configure bucket to be publicly accessible for reading
    
  2. Security Policies
    - Allow authenticated users to upload images to their own folder
    - Allow public read access to all images
    - Allow users to update/delete their own images
    
  3. Folder Structure
    - Images will be stored in user-specific folders: {user_id}/filename
    - This ensures users can only manage their own images
*/

-- Create the images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO UPDATE SET
  public = true;

-- Policy to allow authenticated users to upload images to their own folder
CREATE POLICY "Users can upload images to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow public read access to all images
CREATE POLICY "Public read access for images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'images');

-- Policy to allow users to update their own images
CREATE POLICY "Users can update own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow users to delete their own images
CREATE POLICY "Users can delete own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);