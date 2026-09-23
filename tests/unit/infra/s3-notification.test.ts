import { describe, expect, it } from 'vitest'
import { parseObjectKeys } from '@/infra/queues/s3-notification.js'

describe('parseObjectKeys', () => {
  it('should decode the URL-encoded keys of every record', () => {
    const body = JSON.stringify({
      Records: [
        { s3: { object: { key: 'originals/a%2Fb+c.jpg' } } },
        { s3: { object: { key: 'originals/d.png' } } }
      ]
    })

    expect(parseObjectKeys(body)).toEqual(['originals/a/b c.jpg', 'originals/d.png'])
  })

  it('should ignore the test event S3 sends when the notification is created', () => {
    expect(parseObjectKeys(JSON.stringify({ Event: 's3:TestEvent' }))).toEqual([])
  })
})
