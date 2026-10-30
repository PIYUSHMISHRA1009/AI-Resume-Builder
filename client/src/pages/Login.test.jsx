// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const { post, dispatch, toastSuccess, toastError } = vi.hoisted(() => ({
  post: vi.fn(),
  dispatch: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('../configs/api', () => ({ default: { post } }))
vi.mock('react-redux', () => ({ useDispatch: () => dispatch }))
vi.mock('react-hot-toast', () => ({ default: Object.assign(toastError, { success: toastSuccess }) }))

import Login from './Login'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  localStorage.clear()
})

describe('login form', () => {
  it('switches to sign up and submits the form to the registration endpoint', async () => {
    post.mockResolvedValue({ data: { token: 'test-token', message: 'Created' } })
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/login']}><Login /></MemoryRouter>)

    await user.click(screen.getByText('click here'))
    expect((await screen.findByRole('heading', { name: 'Sign up' }))).not.toBeNull()
    await user.type(screen.getByPlaceholderText('Full Name'), 'Example User')
    await user.type(screen.getByPlaceholderText('Email id'), 'example@example.test')
    await user.type(screen.getByPlaceholderText('Password'), 'test-password')
    await user.click(screen.getByRole('button', { name: 'Sign up' }))

    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/users/register', {
      name: 'Example User',
      email: 'example@example.test',
      password: 'test-password',
    }))
    expect(localStorage.getItem('token')).toBe('test-token')
    expect(dispatch).toHaveBeenCalled()
    expect(toastSuccess).toHaveBeenCalledWith('Created')
  })

  it('shows a server error when login fails', async () => {
    post.mockRejectedValue({ response: { data: { message: 'Invalid Email or Password' } } })
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/login']}><Login /></MemoryRouter>)

    await user.type(screen.getByPlaceholderText('Email id'), 'example@example.test')
    await user.type(screen.getByPlaceholderText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Invalid Email or Password'))
    expect(localStorage.getItem('token')).toBeNull()
  })
})
