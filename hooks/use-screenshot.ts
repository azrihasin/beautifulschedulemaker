import { useCallback } from 'react';
import * as htmlToImage from 'html-to-image';

export interface ScreenshotOptions {
  format?: 'png' | 'jpeg' | 'svg';
  quality?: number;
  pixelRatio?: number;
  backgroundColor?: string;
  width?: number;
  height?: number;
  style?: Record<string, any>;
}

export const useScreenshot = () => {
  const captureElement = useCallback(async (
    element: HTMLElement,
    options: ScreenshotOptions = {}
  ) => {
    const {
      format = 'png',
      quality = 1.0,
      pixelRatio = 2,
      backgroundColor = '#ffffff',
      width,
      height,
      style = {},
    } = options;

    const captureOptions = {
      quality,
      pixelRatio,
      backgroundColor,
      width,
      height,
      style: {
        transform: 'scale(1)',
        ...style,
      },
    };

    try {
      switch (format) {
        case 'png':
          return await htmlToImage.toPng(element, captureOptions);
        case 'jpeg':
          return await htmlToImage.toJpeg(element, captureOptions);
        case 'svg':
          return await htmlToImage.toSvg(element, captureOptions);
        default:
          return await htmlToImage.toPng(element, captureOptions);
      }
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      throw error;
    }
  }, []);

  const downloadImage = useCallback((dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const copyToClipboard = useCallback(async (element: HTMLElement) => {
    try {
      const blob = await htmlToImage.toBlob(element, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      
      if (blob && navigator.clipboard) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Clipboard copy failed:', error);
      return false;
    }
  }, []);

  return {
    captureElement,
    downloadImage,
    copyToClipboard,
  };
};