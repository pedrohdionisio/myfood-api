import { describe, expect, it } from 'vitest'
import { setupTestApp } from '../support/app.js'

const t = setupTestApp()

describe('health', () => {
  it('should report the process as up', async () => {
    const response = await t.request('GET', '/health')

    expect(response.statusCode).toBe(200)
  })

  it('should report the database as reachable', async () => {
    const response = await t.request('GET', '/ready')

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ database: 'up' })
  })
})
