// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import api from './api'

afterEach(() => localStorage.clear())

describe('API authentication', () => {
  it('sends the saved token with requests', async () => {
    localStorage.setItem('token', 'test-token')
    let authorization

    await api.get('/api/users/data', {
      adapter: async (config) => {
        authorization = config.headers.get('Authorization')
        return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
      },
    })

    expect(authorization).toBe('test-token')
  })

  it('preserves an explicit Authorization header', async () => {
    localStorage.setItem('token', 'saved-token')
    let authorization

    await api.get('/api/users/data', {
      headers: { Authorization: 'Bearer explicit-token' },
      adapter: async (config) => {
        authorization = config.headers.get('Authorization')
        return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
      },
    })

    expect(authorization).toBe('Bearer explicit-token')
  })
})
