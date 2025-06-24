import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileForm } from '../components/ProfileForm';
import '@testing-library/jest-dom';

test('submits updated values', () => {
  const handleSubmit = jest.fn();
  render(<ProfileForm initialValues={{ username: 'john', bio: 'hello' }} onSubmit={handleSubmit} />);

  fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'jane' } });
  fireEvent.change(screen.getByLabelText(/bio/i), { target: { value: 'hi' } });
  fireEvent.click(screen.getByText(/save/i));

  expect(handleSubmit).toHaveBeenCalledWith({ username: 'jane', bio: 'hi' });
});
