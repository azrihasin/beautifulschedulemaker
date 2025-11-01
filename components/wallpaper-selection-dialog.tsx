"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageIcon } from "lucide-react";

interface WallpaperOption {
  id: string;
  name: string;
  preview: string;
  path: string;
}

const wallpaperOptions: WallpaperOption[] = [
  {
    id: "default",
    name: "Default",
    preview: "/wallpaper.jpeg",
    path: "/wallpaper.jpeg"
  },
  {
    id: "sky-evening",
    name: "Sky Evening",
    preview: "/sky-evening.jpg",
    path: "/sky-evening.jpg"
  },
  {
    id: "wallpaper",
    name: "Abstract Wallpaper",
    preview: "/wallpaper.jpeg",
    path: "/wallpaper.jpeg"
  },
  {
    id: "sky",
    name: "Sky",
    preview: "/sky.jpg",
    path: "/sky.jpg"
  },
  {
    id: "tokyo-tower",
    name: "Tokyo Tower",
    preview: "/tokyo-tower.jpg",
    path: "/tokyo-tower.jpg"
  }
];

interface WallpaperSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWallpaperSelect: (wallpaper: WallpaperOption) => void;
  selectedWallpaper?: string;
}

export function WallpaperSelectionDialog({
  open,
  onOpenChange,
  onWallpaperSelect,
  selectedWallpaper
}: WallpaperSelectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]">
        <DialogTitle className="sr-only">
          Wallpaper Selection
        </DialogTitle>
        <DialogDescription className="sr-only">
          Choose a wallpaper for your timetable background.
        </DialogDescription>
        <div className="h-[480px] flex flex-col">
          <div className="p-4">
            <h3 className="font-semibold text-sm">
              Wallpapers
            </h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 pt-0">
              <div className="grid grid-cols-4 gap-4">
                {wallpaperOptions.map((wallpaper) => {
                  const isSelected = selectedWallpaper === wallpaper.id;
                  return (
                    <div
                      key={wallpaper.id}
                      className={`relative group border rounded-lg overflow-hidden cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => onWallpaperSelect(wallpaper)}
                    >
                      <div className="aspect-[4/3] relative">
                        {wallpaper.preview ? (
                          <img
                            src={wallpaper.preview}
                            alt={wallpaper.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <div className="text-muted-foreground">
                              <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                              <div className="text-xs">No Wallpaper</div>
                            </div>
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <div className="bg-primary text-primary-foreground rounded-full p-2">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <h4 className={`font-medium text-sm ${
                          isSelected ? "text-primary" : ""
                        }`}>
                          {wallpaper.name}
                          {isSelected && (
                            <span className="ml-2 text-xs text-primary">
                              (Selected)
                            </span>
                          )}
                        </h4>
                      </div>
                    </div>
                  );
                })}
              </div>
              {wallpaperOptions.length === 0 && (
                <div className="text-center text-muted-foreground text-sm">
                  No wallpapers found
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function WallpaperSelectionButton({
  onWallpaperSelect,
  selectedWallpaper,
  children
}: {
  onWallpaperSelect: (wallpaper: WallpaperOption) => void;
  selectedWallpaper?: string;
  children: React.ReactNode;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]">
        <DialogTitle className="sr-only">
          Wallpaper Selection
        </DialogTitle>
        <DialogDescription className="sr-only">
          Choose a wallpaper for your timetable background.
        </DialogDescription>
        <div className="h-[480px] flex flex-col">
          <div className="p-4">
            <h3 className="font-semibold text-sm">
              Wallpapers
            </h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 pt-0">
              <div className="grid grid-cols-4 gap-4">
                {wallpaperOptions.map((wallpaper) => {
                  const isSelected = selectedWallpaper === wallpaper.id;
                  return (
                    <div
                      key={wallpaper.id}
                      className={`relative group border rounded-lg overflow-hidden cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => {
                        onWallpaperSelect(wallpaper);
                        setDialogOpen(false);
                      }}
                    >
                      <div className="aspect-[4/3] relative">
                        {wallpaper.preview ? (
                          <img
                            src={wallpaper.preview}
                            alt={wallpaper.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <div className="text-muted-foreground">
                              <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                              <div className="text-xs">No Wallpaper</div>
                            </div>
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <div className="bg-primary text-primary-foreground rounded-full p-2">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <h4 className={`font-medium text-sm ${
                          isSelected ? "text-primary" : ""
                        }`}>
                          {wallpaper.name}
                          {isSelected && (
                            <span className="ml-2 text-xs text-primary">
                              (Selected)
                            </span>
                          )}
                        </h4>
                      </div>
                    </div>
                  );
                })}
              </div>
              {wallpaperOptions.length === 0 && (
                <div className="text-center text-muted-foreground text-sm">
                  No wallpapers found
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}