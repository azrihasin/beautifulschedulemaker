"use client"

import React from "react"
import { cn } from "@/lib/utils"

export interface GeneratedImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  base64?: string
  uint8Array?: Uint8Array
  mediaType?: string
  alt: string
  className?: string
}

function getImageSrc({ base64, uint8Array, mediaType }: { base64?: string; uint8Array?: Uint8Array; mediaType?: string }) {
  if (base64 && mediaType) {
    return `data:${mediaType};base64,${base64}`
  }
  if (uint8Array && mediaType) {
    const blob = new Blob([uint8Array], { type: mediaType })
    return URL.createObjectURL(blob)
  }
  return undefined
}

const Image = React.forwardRef<HTMLImageElement, GeneratedImageProps>(
  ({ base64, uint8Array, mediaType = "image/png", alt, className, ...props }, ref) => {
    const src = getImageSrc({ base64, uint8Array, mediaType })
    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        className={cn("max-w-full h-auto rounded-lg border", className)}
        role="img"
        {...props}
      />
    )
  }
)

Image.displayName = "Image"

export { Image, type GeneratedImageProps }
