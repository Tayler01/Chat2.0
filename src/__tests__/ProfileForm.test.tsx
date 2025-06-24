import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileForm, ProfileFormValues } from '../components/ProfileForm';
import '@testing-library/jest-dom';

test('calls onSave with updated values', () => {
  const handleSave = jest.fn();
  function Wrapper() {
    const [values, setValues] = useState<ProfileFormValues>({
      username: 'john',
      bio: 'hello',
      avatar_color: '#000',
      avatar_url: '',
      banner_url: ''
    });
    return (
      <ProfileForm
        values={values}
        onChange={setValues}
        onCancel={() => {}}
        onSave={() => handleSave(values)}
        saving={false}
      />
    );
  }

  render(<Wrapper />);

  fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'jane' } });
  fireEvent.change(screen.getByLabelText(/bio/i), { target: { value: 'hi' } });
  fireEvent.click(screen.getByText(/save changes/i));

  expect(handleSave).toHaveBeenCalledWith(expect.objectContaining({ username: 'jane', bio: 'hi' }));
});
