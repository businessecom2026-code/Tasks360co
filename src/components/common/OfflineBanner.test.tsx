import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { OfflineBanner } from './OfflineBanner';

describe('OfflineBanner', () => {
  let listeners: Record<string, (() => void)[]>;

  beforeEach(() => {
    listeners = { online: [], offline: [] };
    vi.spyOn(window, 'addEventListener').mockImplementation((event, cb) => {
      if (listeners[event]) listeners[event].push(cb as () => void);
    });
    vi.spyOn(window, 'removeEventListener').mockImplementation((event, cb) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter(l => l !== cb);
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (globalThis as Record<string, unknown>).__setOnLine?.(true);
  });

  it('should not render when online', () => {
    (globalThis as Record<string, unknown>).__setOnLine?.(true);
    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('should render when offline', () => {
    (globalThis as Record<string, unknown>).__setOnLine?.(false);
    render(<OfflineBanner />);
    expect(screen.getByText(/modo offline/i)).toBeInTheDocument();
  });

  it('should show banner when going offline', () => {
    (globalThis as Record<string, unknown>).__setOnLine?.(true);
    render(<OfflineBanner />);

    expect(screen.queryByText(/modo offline/i)).not.toBeInTheDocument();

    // Simulate going offline
    (globalThis as Record<string, unknown>).__setOnLine?.(false);
    act(() => {
      listeners.offline.forEach(cb => cb());
    });

    expect(screen.getByText(/modo offline/i)).toBeInTheDocument();
  });

  it('should hide banner when coming back online', () => {
    (globalThis as Record<string, unknown>).__setOnLine?.(false);
    render(<OfflineBanner />);

    expect(screen.getByText(/modo offline/i)).toBeInTheDocument();

    // Simulate going online
    (globalThis as Record<string, unknown>).__setOnLine?.(true);
    act(() => {
      listeners.online.forEach(cb => cb());
    });

    expect(screen.queryByText(/modo offline/i)).not.toBeInTheDocument();
  });
});
