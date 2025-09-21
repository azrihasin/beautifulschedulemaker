"use client";

import { useState, useRef, useEffect } from "react";
import { toPng, toJpeg, toSvg } from "html-to-image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CommonPhoneDimensions = [
  { width: 640, height: 1136, note: "iPhone SE (1st Gen)" },
  { width: 720, height: 1280, note: "Android HD" },
  { width: 720, height: 1600, note: "Android HD+" },
  { width: 750, height: 1334, note: "iPhone 6 / 7 / 8" },
  { width: 828, height: 1792, note: "iPhone XR / 11" },
  { width: 1080, height: 1920, note: "iPhone 6+/7+/8+ / Android FHD" },
  { width: 1080, height: 2340, note: "iPhone 12 Mini / Pixel 4a/5 / Android FHD+ (wide)" },
  { width: 1080, height: 2400, note: "Android FHD+ / Pixel 6/7/8" },
  { width: 1080, height: 2640, note: "Galaxy Z Flip" },
  { width: 1125, height: 2436, note: "iPhone X / XS / 11 Pro" },
  { width: 1170, height: 2532, note: "iPhone 12/12 Pro/13/13 Pro/14" },
  { width: 1179, height: 2556, note: "iPhone 14 Pro / 15 / 15 Pro" },
  { width: 1242, height: 2688, note: "iPhone XS Max / 11 Pro Max" },
  { width: 1284, height: 2778, note: "iPhone 12 Pro Max / 13 Pro Max / 14 Plus" },
  { width: 1290, height: 2796, note: "iPhone 14 Pro Max / 15 Plus / 15 Pro Max" },
  { width: 1440, height: 2560, note: "Android QHD" },
  { width: 1440, height: 2960, note: "Android QHD+ (Galaxy S8/S9)" },
  { width: 1440, height: 3120, note: "Pixel 6 Pro / 7 Pro" },
  { width: 1440, height: 3200, note: "Galaxy S20–S23 Ultra" },
  { width: 1812, height: 2176, note: "Galaxy Z Fold (inner)" },
];

interface SaveTimetableDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SaveTimetableDialog({ isOpen, onClose }: SaveTimetableDialogProps) {
  const [selectedDimension, setSelectedDimension] = useState<string>("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const generatePreview = async () => {
    if (!selectedDimension) return;
    
    const timetableElement = document.querySelector('[data-timetable="true"]') as HTMLElement;
    if (!timetableElement) return;

    const dimension = CommonPhoneDimensions.find(d => `${d.width}x${d.height}` === selectedDimension);
    if (!dimension) return;

    try {
      const dataUrl = await toPng(timetableElement, {
        width: dimension.width,
        height: dimension.height,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
      });
      setPreviewImage(dataUrl);
    } catch (error) {
      console.error('Error generating preview:', error);
    }
  };

  useEffect(() => {
    if (selectedDimension) {
      generatePreview();
    }
  }, [selectedDimension]);

  const handleScreenshot = async (format: 'png' | 'jpeg' | 'svg' = 'png') => {
    if (!selectedDimension) return;
    
    const timetableElement = document.querySelector('[data-timetable="true"]') as HTMLElement;
    if (!timetableElement) return;

    const dimension = CommonPhoneDimensions.find(d => `${d.width}x${d.height}` === selectedDimension);
    if (!dimension) return;

    try {
      let dataUrl: string;
      const options = {
        width: dimension.width,
        height: dimension.height,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
      };

      switch (format) {
        case 'png':
          dataUrl = await toPng(timetableElement, options);
          break;
        case 'jpeg':
          dataUrl = await toJpeg(timetableElement, options);
          break;
        case 'svg':
          dataUrl = await toSvg(timetableElement, options);
          break;
        default:
          dataUrl = await toPng(timetableElement, options);
      }

      const link = document.createElement('a');
      link.download = `timetable-${dimension.note.replace(/[^a-zA-Z0-9]/g, '-')}.${format}`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error capturing screenshot:', error);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!selectedDimension) return;
    
    const timetableElement = document.querySelector('[data-timetable="true"]') as HTMLElement;
    if (!timetableElement) return;

    const dimension = CommonPhoneDimensions.find(d => `${d.width}x${d.height}` === selectedDimension);
    if (!dimension) return;

    try {
      const dataUrl = await toPng(timetableElement, {
        width: dimension.width,
        height: dimension.height,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
      });
      
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Save Timetable</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select Phone Dimension:</label>
            <Select value={selectedDimension} onValueChange={setSelectedDimension}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a phone dimension" />
              </SelectTrigger>
              <SelectContent>
                {CommonPhoneDimensions.map((dimension) => (
                  <SelectItem 
                    key={`${dimension.width}x${dimension.height}`} 
                    value={`${dimension.width}x${dimension.height}`}
                  >
                    {dimension.width} × {dimension.height} - {dimension.note}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {previewImage && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Preview:</label>
                <div className="border rounded-lg p-4 bg-gray-50 flex justify-center">
                  <img 
                    src={previewImage} 
                    alt="Timetable Preview" 
                    className="max-w-full max-h-96 object-contain border shadow-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleScreenshot('png')}
                  className="flex items-center text-primary text-sm font-medium rounded-2xl px-3 py-2 border border-input-border hover:bg-input-hover cursor-pointer transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-white"
                >
                  📷
                  <span className="font-geist">PNG</span>
                </button>

                <button
                  onClick={() => handleScreenshot('jpeg')}
                  className="flex items-center text-primary text-sm font-medium rounded-2xl px-3 py-2 border border-input-border hover:bg-input-hover cursor-pointer transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-white"
                >
                  🖼️
                  <span className="font-geist">JPEG</span>
                </button>

                <button
                  onClick={() => handleScreenshot('svg')}
                  className="flex items-center text-primary text-sm font-medium rounded-2xl px-3 py-2 border border-input-border hover:bg-input-hover cursor-pointer transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-white"
                >
                  🎨
                  <span className="font-geist">SVG</span>
                </button>

                <button
                  onClick={handleCopyToClipboard}
                  className="flex items-center text-primary text-sm font-medium rounded-2xl px-3 py-2 border border-input-border hover:bg-input-hover cursor-pointer transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-white"
                >
                  📋
                  <span className="font-geist">Copy</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}