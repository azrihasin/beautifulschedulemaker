'use client';

import React from 'react';
import { ExcalidrawCanvas } from './excalidraw-canvas';

interface ExcalidrawProps {
  /**
   * Path to the SVG file to be loaded and transformed
   */
  path: string;
  
  /**
   * Optional className to apply to the container
   */
  className?: string;
  
  /**
   * Optional width for the SVG container
   */
  width?: string | number;
  
  /**
   * Optional height for the SVG container
   */
  height?: string | number;
}

/**
 * Excalidraw component that renders SVG diagrams with theme awareness
 * This is a wrapper around ExcalidrawCanvas for backward compatibility
 */
export function Excalidraw({
  path,
  className,
  width,
  height
}: ExcalidrawProps) {
  return (
    <ExcalidrawCanvas
      path={path}
      className={className}
      width={width}
      height={height}
    />
  );
}