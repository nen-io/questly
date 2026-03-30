import { useEffect, useState } from 'react'

export type LoginHeroContrast = 'black' | 'white'

const contrastSampleSize = 28
const darkTextThreshold = 156

export function useLoginHeroContrast(imageUrl: string | null) {
  const [contrast, setContrast] = useState<LoginHeroContrast>('black')

  useEffect(() => {
    if (!imageUrl) {
      setContrast('black')
      return
    }

    let cancelled = false
    const image = new Image()

    image.crossOrigin = 'anonymous'
    image.decoding = 'async'
    image.referrerPolicy = 'no-referrer'
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d', { willReadFrequently: true })

        if (!context) {
          throw new Error('Canvas is unavailable')
        }

        canvas.width = contrastSampleSize
        canvas.height = contrastSampleSize
        context.drawImage(image, 0, 0, contrastSampleSize, contrastSampleSize)

        const { data } = context.getImageData(0, 0, contrastSampleSize, contrastSampleSize)
        let totalLuminance = 0
        let populatedSamples = 0

        for (let index = 0; index < data.length; index += 4) {
          const alpha = data[index + 3] / 255
          if (alpha === 0) {
            continue
          }

          totalLuminance += (
            (0.2126 * data[index]) +
            (0.7152 * data[index + 1]) +
            (0.0722 * data[index + 2])
          ) * alpha
          populatedSamples += 1
        }

        const averageLuminance = populatedSamples === 0
          ? 255
          : totalLuminance / populatedSamples

        if (!cancelled) {
          setContrast(averageLuminance >= darkTextThreshold ? 'black' : 'white')
        }
      } catch {
        // Fall back to light text because the mobile hero overlay is dark enough to keep it legible.
        if (!cancelled) {
          setContrast('white')
        }
      }
    }
    image.onerror = () => {
      if (!cancelled) {
        setContrast('white')
      }
    }
    image.src = imageUrl

    return () => {
      cancelled = true
    }
  }, [imageUrl])

  return contrast
}
