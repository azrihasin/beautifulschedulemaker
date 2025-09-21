'use client';

import React from 'react';
import { Excalidraw } from '@/components/excalidraw';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';

export default function ExcalidrawDemoPage() {
  const { theme, setTheme } = useTheme();
  
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Excalidraw SVG Demo</h1>
        <Button onClick={toggleTheme}>
          Toggle Theme ({theme})
        </Button>
      </div>
      
      <div className="border rounded-lg p-6 bg-[var(--color-background)]">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold mb-2">Timetable Planning Process</h2>
          <p className="text-muted-foreground">
            This diagram demonstrates the client-side Excalidraw component with theme-aware SVG rendering.
          </p>
        </div>
        
        <div className="h-[500px] border rounded-lg overflow-hidden">
          <Excalidraw path="/example-diagram.svg" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-6 bg-[var(--color-background)]">
          <h3 className="text-lg font-semibold mb-4">Features</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Client-side SVG loading and parsing</li>
            <li>Dynamic theme switching (light/dark)</li>
            <li>Responsive SVG rendering</li>
            <li>CSS class-based color inheritance</li>
            <li>Font family replacement</li>
          </ul>
        </div>
        
        <div className="border rounded-lg p-6 bg-[var(--color-background)]">
          <h3 className="text-lg font-semibold mb-4">Implementation Details</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Uses browser's DOMParser for SVG parsing</li>
            <li>Replaces hardcoded colors with theme-aware classes</li>
            <li>Sets responsive dimensions (width="100%", height="100%")</li>
            <li>Handles loading and error states</li>
            <li>Synchronizes with theme changes via next-themes</li>
          </ul>
        </div>
      </div>
    </div>
  );
}