import React, { useState } from 'react'
import { Slider } from "@/components/ui/slider"
import { useSettingsStore } from "@/stores/settingsStore"

const BackgroundImageCropper = ({ onCropComplete }: any) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const { backgroundImage, setBackgroundImage } = useSettingsStore()
  
  const onCropChange = (crop: any) => {
    setCrop(crop)
  }
  
  const onZoomChange = (zoom: any) => {
    setZoom(zoom)
  }
  
  const handleCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    console.log(croppedAreaPixels)
    onCropComplete && onCropComplete(croppedArea, croppedAreaPixels)
  }
  
  return (
    <div className="w-full h-full">
      <div className="relative w-full" style={{ height: '70vh' }}>
      </div>
      <div className="mt-4 px-4">
        <p className="text-sm mb-2">Zoom</p>
        <Slider
          value={[zoom]}
          min={1}
          max={3}
          step={0.1}
          onValueChange={(values) => onZoomChange(values[0])}
        />
      </div>
    </div>
  )
}

export default BackgroundImageCropper