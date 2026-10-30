import { vi } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import authSlice from '@client/app/features/authSlice';

const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice,
    },
    preloadedState: {
      auth: {
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        ...preloadedState.auth,
      },
    },
  });
};

const AllProviders = ({ children, store }: { children: React.ReactNode; store: ReturnType<typeof createTestStore> }) => {
  return (
    <Provider store={store}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </Provider>
  );
};

export const renderWithProviders = (
  ui: React.ReactElement,
  options: RenderOptions & { preloadedState?: any } = {}
) => {
  const { preloadedState, ...renderOptions } = options;
  const store = createTestStore(preloadedState);
  return render(ui, {
    wrapper: ({ children }) => <AllProviders store={store}>{children}</AllProviders>,
    ...renderOptions,
  });
};

export const loginUser = (store: ReturnType<typeof createTestStore>, user = { _id: '507f1f77bcf86cd799439011', name: 'Test User', email: 'test@example.com' }, token = 'test-token') => {
  store.dispatch({ type: 'auth/login', payload: { user, token } });
};

export const logoutUser = (store: ReturnType<typeof createTestStore>) => {
  store.dispatch({ type: 'auth/logout' });
};

export const mockLocalStorage = () => {
  const store: Record<string, string> = {};
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => store[key] || null);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => { store[key] = value; });
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => { delete store[key]; });
  vi.spyOn(Storage.prototype, 'clear').mockImplementation(() => { Object.keys(store).forEach(key => delete store[key]); });
  return store;
};

export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export { vi, expect } from 'vitest';