import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { signInWithPopup } from 'firebase/auth';
import LoginPage from '@/app/login/page';
import { useAppStore } from '@/stores/app.store';

vi.mock('firebase/auth', () => ({ signInWithPopup: vi.fn() }));

const initialState = useAppStore.getState();

describe('LoginPage', () => {
  beforeEach(() => {
    useAppStore.setState(initialState, true);
    useAppStore.setState({ authReady: true, user: null });
    vi.mocked(signInWithPopup).mockResolvedValue({} as never);
    window.history.pushState({}, '', '/login?next=%2Fsettings');
  });

  it('renders the Coinbase-style dark hero and signs in with Google', async () => {
    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: 'Domain Register' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Sign in with Google/i }));

    await waitFor(() => expect(signInWithPopup).toHaveBeenCalledTimes(1));
  });

  it('shows an inline error when Google sign-in fails', async () => {
    vi.mocked(signInWithPopup).mockRejectedValue(new Error('Popup closed'));

    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /Sign in with Google/i }));

    expect(await screen.findByText('Popup closed')).toBeInTheDocument();
  });
});
