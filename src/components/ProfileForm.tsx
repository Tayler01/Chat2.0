import React, { useState } from 'react';

interface ProfileFormProps {
  initialValues: { username: string; bio?: string };
  onSubmit: (values: { username: string; bio: string }) => void;
}

export function ProfileForm({ initialValues, onSubmit }: ProfileFormProps) {
  const [username, setUsername] = useState(initialValues.username);
  const [bio, setBio] = useState(initialValues.bio || '');

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ username, bio }); }}>
      <label>
        Username
        <input
          aria-label="username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
      </label>
      <label>
        Bio
        <textarea
          aria-label="bio"
          value={bio}
          onChange={e => setBio(e.target.value)}
        />
      </label>
      <button type="submit">Save</button>
    </form>
  );
}
