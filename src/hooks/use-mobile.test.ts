// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useIsMobile } from '@/hooks/use-mobile';

describe('useIsMobile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when window innerWidth is < 768px', () => {
    window.innerWidth = 500;
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener,
        removeEventListener,
        dispatchEvent: vi.fn(),
      })),
    });

    const { result } = renderHook(() => useIsMobile());
    
    expect(result.current).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767px)');
    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('returns false when window innerWidth is >= 768px', () => {
    window.innerWidth = 800;
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener,
        removeEventListener,
        dispatchEvent: vi.fn(),
      })),
    });

    const { result } = renderHook(() => useIsMobile());
    
    expect(result.current).toBe(false);
  });

  it('updates state dynamically on window resize', () => {
    window.innerWidth = 800;
    
    let changeListener: (() => void) | undefined;
    const addEventListener = vi.fn().mockImplementation((event, listener) => {
      changeListener = listener;
    });
    const removeEventListener = vi.fn();
    
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener,
        removeEventListener,
        dispatchEvent: vi.fn(),
      })),
    });

    const { result } = renderHook(() => useIsMobile());
    
    expect(result.current).toBe(false);

    // Simulate resize
    act(() => {
      window.innerWidth = 500;
      if (changeListener) changeListener();
    });

    expect(result.current).toBe(true);
  });
});
