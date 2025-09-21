"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';

interface ExcalidrawCanvasProps {
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
 * ExcalidrawCanvas component that processes Excalidraw SVGs entirely client-side
 * and transforms them to be theme-aware and responsive.
 */
export function ExcalidrawCanvas({
  path,
  className = '',
  width = '100%',
  height = '100%',
}: ExcalidrawCanvasProps) {
  const { theme } = useTheme();
  const [svgContent, setSvgContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch and transform the SVG content
  useEffect(() => {
    const fetchSvg = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(path);
        
        if (!response.ok) {
          throw new Error(`Failed to load SVG: ${response.status} ${response.statusText}`);
        }
        
        const svgText = await response.text();
        setSvgContent(svgText);
      } catch (err) {
        console.error('Error loading SVG:', err);
        setError(err instanceof Error ? err.message : 'Failed to load SVG');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSvg();
  }, [path]);

  // Transform the SVG to be theme-aware and responsive
  const transformedSvg = useMemo(() => {
    if (!svgContent) return '';
    
    try {
      // Parse the SVG using DOMParser
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, 'image/svg+xml');
      const svgElement = doc.documentElement;
      
      // Set responsive dimensions
      svgElement.setAttribute('width', '100%');
      svgElement.setAttribute('height', '100%');
      
      // Process all elements with stroke or fill attributes
      const elementsWithStroke = svgElement.querySelectorAll('[stroke]');
      const elementsWithFill = svgElement.querySelectorAll('[fill]');
      
      // Replace hardcoded stroke values with theme-aware classes
      elementsWithStroke.forEach(element => {
        if (element.getAttribute('stroke') && element.getAttribute('stroke') !== 'none') {
          element.setAttribute('stroke', 'currentColor');
          element.classList.add('stroke-current');
        }
      });
      
      // Replace hardcoded fill values with theme-aware classes
      elementsWithFill.forEach(element => {
        const fillValue = element.getAttribute('fill');
        if (fillValue && fillValue !== 'none') {
          // Skip white fills for background elements
          if (fillValue.toLowerCase() === '#ffffff' || fillValue.toLowerCase() === 'white') {
            // For white fills, use a theme-aware background color
            element.setAttribute('fill', 'var(--background)');
          } else {
            element.setAttribute('fill', 'currentColor');
            element.classList.add('fill-current');
          }
        }
      });
      
      // Optional: Replace font-family declarations
      const elementsWithFontFamily = svgElement.querySelectorAll('[font-family]');
      elementsWithFontFamily.forEach(element => {
        const fontFamily = element.getAttribute('font-family');
        if (fontFamily && fontFamily.toLowerCase().includes('indie flower')) {
          element.classList.add('font-indieflower');
        }
      });
      
      // Add theme-specific class to the SVG root
      svgElement.classList.add('excalidraw-svg');
      if (theme === 'dark') {
        svgElement.classList.add('dark-theme');
      } else {
        svgElement.classList.add('light-theme');
      }
      
      // Serialize back to string
      const serializer = new XMLSerializer();
      return serializer.serializeToString(doc);
    } catch (err) {
      console.error('Error transforming SVG:', err);
      return svgContent; // Return original content on error
    }
  }, [svgContent, theme]);

  // Render loading state
  if (isLoading) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="animate-pulse text-muted-foreground">Loading diagram...</div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div 
        className={`flex items-center justify-center text-destructive ${className}`}
        style={{ width, height }}
      >
        Error: {error}
      </div>
    );
  }

  // Render the transformed SVG
  return (
    <div 
      className={`excalidraw-canvas ${className}`}
      style={{ width, height }}
      dangerouslySetInnerHTML={{ __html: transformedSvg }}
    />
  );
}