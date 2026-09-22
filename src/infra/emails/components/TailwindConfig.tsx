import { pixelBasedPreset, Tailwind } from '@react-email/components'
import type { ReactNode } from 'react'

interface ITailwindConfigProps {
  children: ReactNode
}

export function TailwindConfig({ children }: ITailwindConfigProps) {
  return (
    <Tailwind
      config={{
        presets: [pixelBasedPreset],
        theme: {
          extend: {
            colors: {
              myfood: {
                red: '#E23744',
                ink: '#1C1C1E',
                muted: '#6B7280',
                surface: '#F4F4F5'
              }
            }
          }
        }
      }}
    >
      {children}
    </Tailwind>
  )
}
