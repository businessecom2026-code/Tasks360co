import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from './RegisterPage';

// Mock the api
vi.mock('../lib/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

// Mock useAuthStore
vi.mock('../stores/useAuthStore', () => ({
  useAuthStore: Object.assign(
    vi.fn(() => ({
      isAuthenticated: false,
    })),
    {
      setState: vi.fn(),
      getState: vi.fn(() => ({ isAuthenticated: false })),
    }
  ),
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { api } from '../lib/api';

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );
  };

  it('should render the registration form', () => {
    renderPage();

    expect(screen.getByText('Criar nova conta')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Seu nome completo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Mínimo 6 caracteres')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Repita a senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /criar conta/i })).toBeInTheDocument();
  });

  it('should show error when passwords do not match', async () => {
    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Seu nome completo'), 'João Silva');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'joao@test.com');
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'password123');
    await user.type(screen.getByPlaceholderText('Repita a senha'), 'differentpassword');

    await user.click(screen.getByRole('button', { name: /criar conta/i }));

    expect(screen.getByText('As senhas não coincidem')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('should show error when password is too short', async () => {
    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Seu nome completo'), 'João');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'joao@test.com');
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), '123');
    await user.type(screen.getByPlaceholderText('Repita a senha'), '123');

    await user.click(screen.getByRole('button', { name: /criar conta/i }));

    expect(screen.getByText('A senha deve ter pelo menos 6 caracteres')).toBeInTheDocument();
  });

  it('should call API on successful submission', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      success: true,
      data: {
        token: 'jwt-token-123',
        user: { id: 'u1', name: 'João', email: 'joao@test.com', role: 'COLABORADOR' },
      },
    });

    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Seu nome completo'), 'João Silva');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'joao@test.com');
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'password123');
    await user.type(screen.getByPlaceholderText('Repita a senha'), 'password123');

    await user.click(screen.getByRole('button', { name: /criar conta/i }));

    expect(api.post).toHaveBeenCalledWith('/auth/register', {
      name: 'João Silva',
      email: 'joao@test.com',
      password: 'password123',
    });
  });

  it('should show success message after registration', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      success: true,
      data: {
        token: 'jwt-token-123',
        user: { id: 'u1', name: 'João', email: 'joao@test.com', role: 'COLABORADOR' },
      },
    });

    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Seu nome completo'), 'João Silva');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'joao@test.com');
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'password123');
    await user.type(screen.getByPlaceholderText('Repita a senha'), 'password123');

    await user.click(screen.getByRole('button', { name: /criar conta/i }));

    expect(screen.getByText('Conta criada!')).toBeInTheDocument();
  });

  it('should show API error message on failure', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      success: false,
      error: 'E-mail já cadastrado',
    });

    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Seu nome completo'), 'João');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'existing@test.com');
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'password123');
    await user.type(screen.getByPlaceholderText('Repita a senha'), 'password123');

    await user.click(screen.getByRole('button', { name: /criar conta/i }));

    expect(screen.getByText('E-mail já cadastrado')).toBeInTheDocument();
  });

  it('should have link back to login', () => {
    renderPage();
    const link = screen.getByText('Já tenho conta');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/login');
  });
});
