interface IS3EventRecord {
  s3?: { object?: { key?: string } }
}

export function parseObjectKeys(body: string): string[] {
  const payload = JSON.parse(body) as { Records?: IS3EventRecord[] }

  // Ao criar a notificação o S3 manda um s3:TestEvent, que não tem Records.
  return (payload.Records ?? [])
    .map((record) => record.s3?.object?.key)
    .filter((key): key is string => Boolean(key))
    .map((key) => decodeURIComponent(key.replace(/\+/g, ' ')))
}
