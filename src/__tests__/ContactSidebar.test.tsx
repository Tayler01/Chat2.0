import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContactSidebar } from '../components/dms/ContactSidebar';

import '@testing-library/jest-dom';

function setup(overrides: Partial<React.ComponentProps<typeof ContactSidebar>> = {}) {
  const baseConversations = [
    {
      id: '1',
      user1_id: 'a',
      user2_id: 'b',
      user1_username: 'Alice',
      user2_username: 'Bob',
      messages: [{ id: 'm1', sender_id: 'a', content: 'Hello', created_at: '' }],
      updated_at: ''
    }
  ];
  const baseUsers = [
    { id: 'b', username: 'Bob', avatar_color: '#000' }
  ];
  const props: React.ComponentProps<typeof ContactSidebar> = {
    searchQuery: '',
    setSearchQuery: jest.fn(),
    activeTab: 'recent',
    setActiveTab: jest.fn(),
    loading: false,
    sortedConversations: baseConversations,
    sortedUsers: baseUsers,
    selectedConversationId: null,
    unreadConversations: [],
    onSelectConversation: jest.fn(),
    startConversation: jest.fn(),
    getOtherUser: () => ({ id: 'b', username: 'Bob' }),
    getOtherUserData: () => baseUsers[0],
    activeUserIds: [],
    ...overrides
  };
  render(<ContactSidebar {...props} />);
  return props;
}

test('calls setSearchQuery when typing in search input', () => {
  const props = setup();
  const input = screen.getByPlaceholderText(/search users/i);
  fireEvent.change(input, { target: { value: 'bob' } });
  expect(props.setSearchQuery).toHaveBeenCalledWith('bob');
});

test('calls setActiveTab when clicking All tab', () => {
  const props = setup();
  fireEvent.click(screen.getByText(/all/i));
  expect(props.setActiveTab).toHaveBeenCalledWith('all');
});

test('calls onSelectConversation when conversation clicked', () => {
  const props = setup();
  fireEvent.click(screen.getByText('Bob'));
  expect(props.onSelectConversation).toHaveBeenCalled();
});
