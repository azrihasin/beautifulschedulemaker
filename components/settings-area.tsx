"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTimetableStore } from "@/stores/timetableStore";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "./ui/input";
import {
  Bold,
  ChevronDown,
  Italic,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  EyeOff,
  Eye,
  Move,
  RotateCw,
  ZoomIn,
  ZoomOut,
  ArrowLeft,
} from "lucide-react";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
// Remove this import
// import Cropper from 'react-easy-crop';

interface Props {
  setSettingsMode: (val: boolean) => void;
}

const abbreviationFormats = {
  full: {
    Monday: "Monday",
    Tuesday: "Tuesday",
    Wednesday: "Wednesday",
    Thursday: "Thursday",
    Friday: "Friday",
    Saturday: "Saturday",
    Sunday: "Sunday",
  },
  three: {
    Monday: "Mon",
    Tuesday: "Tue",
    Wednesday: "Wed",
    Thursday: "Thu",
    Friday: "Fri",
    Saturday: "Sat",
    Sunday: "Sun",
  },
  two: {
    Monday: "Mo",
    Tuesday: "Tu",
    Wednesday: "We",
    Thursday: "Th",
    Friday: "Fr",
    Saturday: "Sa",
    Sunday: "Su",
  },
  single: {
    Monday: "M",
    Tuesday: "T",
    Wednesday: "W",
    Thursday: "R",
    Friday: "F",
    Saturday: "S",
    Sunday: "U",
  },
};

export default function SettingsArea({ setSettingsMode }: any) {
  const {
    courseCode,
    courseName,
    time,
    days,
    opacity,
    abbreviationFormat,
    setAbbreviationFormat,
    setOpacity,
    setCourseCodeFontFamily,
    setCourseCodeFontSize,
    setCourseCodeFontWeight,
    setCourseCodeFontStyle,
    setCourseCodeColor,
    setCourseNameFontFamily,
    setCourseNameFontSize,
    setCourseNameFontWeight,
    setCourseNameFontStyle,
    setCourseNameColor,
    setCourseCodeTextAlign,
    setCourseNameTextAlign,
    setHideCourseCode,
    setHideCourseName,
    // Time setters
    setTimeFontFamily,
    setTimeFontSize,
    setTimeFontWeight,
    setTimeFontStyle,
    setTimeColor,
    setTimeTextAlign,
    setHideTime,
    // Days setters
    setDaysFontFamily,
    setDaysFontSize,
    setDaysFontWeight,
    setDaysFontStyle,
    setDaysColor,
    setDaysTextAlign,
    setHideDays,
  } = useSettingsStore();

  const { 
    getActiveTimetableBackground, 
    setTimetableBackgroundImage, 
    setTimetableBackgroundSize, 
    setTimetableBackgroundPositionX, 
    setTimetableBackgroundPositionY, 
    setTimetableBackgroundRotation,
    activeTimetableId 
  } = useTimetableStore();

  const timetableBackground = getActiveTimetableBackground();
  const backgroundImage = timetableBackground?.backgroundImage || null;
  const backgroundSize = timetableBackground?.backgroundSize || 300;
  const backgroundPositionX = timetableBackground?.backgroundPositionX || 50;
  const backgroundPositionY = timetableBackground?.backgroundPositionY || 50;
  const backgroundRotation = timetableBackground?.backgroundRotation || 0;
  return (
    <div className="w-full h-[500px] border rounded-xl bg-[#f2f2f6] flex flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <button
            onClick={() => setSettingsMode(false)}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4  cursor-pointer" />
            <span className="cursor-pointer">Back</span>
          </button>

          <div className="p-4 bg-white rounded-xl border border-[#E0E0E0] shadow-sm">
            <p className="text-sm font-medium mb-3">Background Image</p>
            <div className="flex gap-2 items-center mb-2">
              <input
                type="file"
                accept="image/*"
                id="background-upload"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && activeTimetableId) {
                    // Check file size before processing
                    const maxFileSize = 5 * 1024 * 1024; // 5MB
                    if (file.size > maxFileSize) {
                      alert('Image file is too large. Please choose a file smaller than 5MB.');
                      return;
                    }
                    
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const imageUrl = event.target?.result as string;
                      console.log('Setting background image:', imageUrl.substring(0, 50) + '...');
                      setTimetableBackgroundImage(activeTimetableId, imageUrl);
                    };
                    reader.onerror = (error) => {
                      console.error('Error reading file:', error);
                      alert('Error reading the image file. Please try again.');
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <label
                htmlFor="background-upload"
                className="px-3 py-1 text-xs rounded transition-colors cursor-pointer bg-[#F5F5F5] hover:bg-[#EEEEEE]"
              >
                Choose Image
              </label>
              <button
                onClick={() => {
                  if (activeTimetableId) {
                    setTimetableBackgroundImage(activeTimetableId, null);
                    setTimetableBackgroundSize(activeTimetableId, 300);
                    setTimetableBackgroundPositionX(activeTimetableId, 50);
                    setTimetableBackgroundPositionY(activeTimetableId, 50);
                    setTimetableBackgroundRotation(activeTimetableId, 0);
                  }
                }}
                className="px-3 py-1 text-xs rounded transition-colors cursor-pointer bg-[#F5F5F5] hover:bg-[#EEEEEE]"
              >
                Clear
              </button>
            </div>

            {/* Image Preview */}
            {backgroundImage && (
              <div className="mt-2 p-2 bg-[#F9F9F9] rounded border">
                <img
                  src={backgroundImage}
                  alt="Background preview"
                  className="max-w-full h-32 object-cover rounded"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Preview of selected background image
                </p>
              </div>
            )}

            {/* Background Controls */}
            {backgroundImage && (
              <div className="mt-4 space-y-4">
                {/* Size Control */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ZoomIn className="w-4 h-4 text-gray-600" />
                    <p className="text-sm font-medium">Size</p>
                  </div>
                  <Slider
                    min={5}
                    max={500}
                    step={5}
                    value={[backgroundSize]}
                    onValueChange={(val: any) => {
                      if (activeTimetableId) {
                        setTimetableBackgroundSize(activeTimetableId, val[0]);
                      }
                    }}
                    className="w-full"
                  />
                  <p className="text-xs mt-1 text-muted-foreground">
                    {backgroundSize}%
                  </p>
                </div>

                {/* Position Controls */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Move className="w-4 h-4 text-gray-600" />
                    <p className="text-sm font-medium">Position</p>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Horizontal: {backgroundPositionX}%
                      </p>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[backgroundPositionX]}
                        onValueChange={(val: any) => {
                          if (activeTimetableId) {
                            setTimetableBackgroundPositionX(activeTimetableId, val[0]);
                          }
                        }}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Vertical: {backgroundPositionY}%
                      </p>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[backgroundPositionY]}
                        onValueChange={(val: any) => {
                          if (activeTimetableId) {
                            setTimetableBackgroundPositionY(activeTimetableId, val[0]);
                          }
                        }}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Rotation Control */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <RotateCw className="w-4 h-4 text-gray-600" />
                    <p className="text-sm font-medium">Rotation</p>
                  </div>
                  <Slider
                    min={-180}
                    max={180}
                    step={1}
                    value={[backgroundRotation]}
                    onValueChange={(val: any) => {
                      if (activeTimetableId) {
                        setTimetableBackgroundRotation(activeTimetableId, val[0]);
                      }
                    }}
                    className="w-full"
                  />
                  <p className="text-xs mt-1 text-muted-foreground">
                    {backgroundRotation}°
                  </p>
                </div>

                {/* Reset Button */}
                <button
                  onClick={() => {
                    if (activeTimetableId) {
                      setTimetableBackgroundSize(activeTimetableId, 300);
                      setTimetableBackgroundPositionX(activeTimetableId, 50);
                      setTimetableBackgroundPositionY(activeTimetableId, 50);
                      setTimetableBackgroundRotation(activeTimetableId, 0);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm rounded transition-colors cursor-pointer bg-[#F5F5F5] hover:bg-[#EEEEEE] border"
                >
                  Reset to Default
                </button>

                {/* Save as Default Button */}
                <button
                  onClick={() => {
                    if (activeTimetableId) {
                      const { setBackgroundImage, setBackgroundSize, setBackgroundPositionX, setBackgroundPositionY, setBackgroundRotation } = useSettingsStore.getState();
                      setBackgroundImage(backgroundImage);
                      setBackgroundSize(backgroundSize);
                      setBackgroundPositionX(backgroundPositionX);
                      setBackgroundPositionY(backgroundPositionY);
                      setBackgroundRotation(backgroundRotation);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm rounded transition-colors cursor-pointer bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700"
                >
                  Save as Default for New Timetables
                </button>
              </div>
            )}

            <p className="text-xs mt-1 text-muted-foreground">
              Supported formats: JPG, PNG, GIF
            </p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-[#E0E0E0]">
            <p className="text-sm font-medium mb-3">Opacity</p>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[opacity]}
              onValueChange={(val: any) => setOpacity(val[0])}
            />
            <p className="text-xs mt-2 text-muted-foreground">{opacity}%</p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-[#E0E0E0]">
            <p className="text-sm font-medium mb-3">Day Format</p>
            <div className="flex gap-1">
              {Object.keys(abbreviationFormats).map((format) => (
                <button
                  key={format}
                  onClick={() => setAbbreviationFormat(format)}
                  className={`px-3 py-1 text-xs rounded transition-colors cursor-pointer ${
                    abbreviationFormat === format
                      ? "bg-[#e6f2ff] text-blue-500"
                      : "bg-[#F5F5F5] hover:bg-[#EEEEEE]"
                  }`}
                >
                  {format}
                </button>
              ))}
            </div>
          </div>

          {/* Course Code Settings */}
          <div className="p-4 bg-white rounded-xl border border-[#E0E0E0]">
            <ToolbarSection
              label="Course Code"
              settings={courseCode}
              setters={{
                setFontFamily: setCourseCodeFontFamily,
                setFontSize: setCourseCodeFontSize,
                setFontWeight: setCourseCodeFontWeight,
                setFontStyle: setCourseCodeFontStyle,
                setColor: setCourseCodeColor,
                setTextAlign: setCourseCodeTextAlign,
                setHideCourseCode: setHideCourseCode,
              }}
            />
          </div>

          {/* Course Name Settings */}
          <div className="p-4 bg-white rounded-xl border border-[#E0E0E0]">
            <ToolbarSection
              label="Course Name"
              settings={courseName}
              setters={{
                setFontFamily: setCourseNameFontFamily,
                setFontSize: setCourseNameFontSize,
                setFontWeight: setCourseNameFontWeight,
                setFontStyle: setCourseNameFontStyle,
                setColor: setCourseNameColor,
                setTextAlign: setCourseNameTextAlign,
                setHideCourseName: setHideCourseName,
              }}
            />
          </div>

          <div className="p-4 bg-white rounded-xl border border-[#E0E0E0]">
            <ToolbarSection
              label="Time"
              settings={time}
              setters={{
                setFontFamily: setTimeFontFamily,
                setFontSize: setTimeFontSize,
                setFontWeight: setTimeFontWeight,
                setFontStyle: setTimeFontStyle,
                setColor: setTimeColor,
                setTextAlign: setTimeTextAlign,
                setHideTime: setHideTime,
              }}
            />
          </div>

          <div className="p-4 bg-white rounded-xl border border-[#E0E0E0]">
            <ToolbarSection
              label="Days"
              settings={days}
              setters={{
                setFontFamily: setDaysFontFamily,
                setFontSize: setDaysFontSize,
                setFontWeight: setDaysFontWeight,
                setFontStyle: setDaysFontStyle,
                setColor: setDaysColor,
                setTextAlign: setDaysTextAlign,
                setHideDays: setHideDays,
              }}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

const fontFamilies = [
  "Arial",
  "Times New Roman",
  "Helvetica",
  "Georgia",
  "Verdana",
  "Geist Sans",
  "Inter",
  "Jakarta",
  "Space Grotesk",
];

const ToolbarSection = ({ label, settings, setters }: any) => {
  const { hideCourseCode, hideCourseName, hideDays, hideTime } =
    useSettingsStore();

  const isHidden =
    label === "Course Code"
      ? hideCourseCode
      : label === "Course Name"
      ? hideCourseName
      : label === "Days"
      ? hideDays
      : hideTime;

  const toggleVisibility = () => {
    if (label === "Course Code") {
      setters.setHideCourseCode(!hideCourseCode);
    } else if (label === "Course Name") {
      setters.setHideCourseName(!hideCourseName);
    } else if (label === "Days") {
      setters.setHideDays(!hideDays);
    } else if (label === "Time") {
      setters.setHideTime(!hideTime);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-1">
        <p className="text-sm font-medium">{label}</p>
      </div>

      <div className="flex gap-3">
        {/* Font Family Dropdown - Keep existing */}
        <Select
          value={settings.fontFamily}
          onValueChange={setters.setFontFamily}
        >
          <SelectTrigger className="h-8 w-40 border bg-[#F5F5F5] hover:bg-[#EEEEEE] focus:bg-white text-sm rounded">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fontFamilies.map((font) => (
              <SelectItem key={font} value={font} className="text-sm">
                {font}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Font Size Input - Keep as number input */}
        <Input
          type="number"
          min="8"
          max="72"
          value={settings.fontSize}
          onChange={(e) => setters.setFontSize(Number(e.target.value))}
          className="h-8 w-20 bg-[#F5F5F5] hover:bg-[#EEEEEE] focus:bg-white text-sm text-center rounded border"
        />

        {/* Bold Button - Apply consistent styling */}
        <button
          onClick={() =>
            setters.setFontWeight(
              settings.fontWeight === "bold" ? "normal" : "bold"
            )
          }
          className={`h-8 w-8 p-0 rounded transition-colors cursor-pointer flex items-center justify-center ${
            settings.fontWeight === "bold"
              ? "bg-[#e6f2ff] text-blue-500 border"
              : "bg-[#F5F5F5] hover:bg-[#EEEEEE] border"
          }`}
        >
          <Bold className="h-4 w-4" />
        </button>

        {/* Italic Button - Apply consistent styling */}
        <button
          onClick={() =>
            setters.setFontStyle(
              settings.fontStyle === "italic" ? "normal" : "italic"
            )
          }
          className={`h-8 w-8 p-0 rounded transition-colors cursor-pointer flex items-center justify-center ${
            settings.fontStyle === "italic"
              ? "bg-[#e6f2ff] text-blue-500 border"
              : "bg-[#F5F5F5] hover:bg-[#EEEEEE] border"
          }`}
        >
          <Italic className="h-4 w-4" />
        </button>

        {/* Text Alignment Buttons - Microsoft Word style */}
        <div className="flex">
          {/* Align Left Button */}
          <button
            onClick={() => setters.setTextAlign("left")}
            className={`h-8 w-8 p-0 rounded-l transition-colors cursor-pointer flex items-center justify-center ${
              settings.textAlign === "left"
                ? "bg-[#e6f2ff] text-blue-500 border"
                : "bg-[#F5F5F5] hover:bg-[#EEEEEE] border"
            }`}
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </button>

          {/* Align Center Button */}
          <button
            onClick={() => setters.setTextAlign("center")}
            className={`h-8 w-8 p-0 border-l-0 border-r-0 transition-colors cursor-pointer flex items-center justify-center ${
              settings.textAlign === "center"
                ? "bg-[#e6f2ff] text-blue-500 border"
                : "bg-[#F5F5F5] hover:bg-[#EEEEEE] border"
            }`}
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </button>

          {/* Align Right Button */}
          <button
            onClick={() => setters.setTextAlign("right")}
            className={`h-8 w-8 p-0 border-l-0 border-r-0 transition-colors cursor-pointer flex items-center justify-center ${
              settings.textAlign === "right"
                ? "bg-[#e6f2ff] text-blue-500 border"
                : "bg-[#F5F5F5] hover:bg-[#EEEEEE] border"
            }`}
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </button>

          {/* Align Justify Button */}
          <button
            onClick={() => setters.setTextAlign("justify")}
            className={`h-8 w-8 p-0 rounded-r transition-colors cursor-pointer flex items-center justify-center ${
              settings.textAlign === "justify"
                ? "bg-[#e6f2ff] text-blue-500 border"
                : "bg-[#F5F5F5] hover:bg-[#EEEEEE] border"
            }`}
            title="Justify"
          >
            <AlignJustify className="h-4 w-4" />
          </button>
        </div>

        {/* Color Picker - Keep existing functionality with consistent styling */}
        <div className="relative">
          <button className="h-8 w-8 rounded bg-[#F5F5F5] hover:bg-[#EEEEEE] transition-colors cursor-pointer flex items-center justify-center relative overflow-hidden border">
            <Palette className="h-4 w-4" />
            <div
              className="absolute bottom-0 left-0 right-0 h-1"
              style={{ backgroundColor: settings.color }}
            />
            <input
              type="color"
              value={settings.color}
              onChange={(e) => setters.setColor(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </button>
        </div>

        {/* Hide Course Code Checkbox */}
        <button
          onClick={toggleVisibility}
          className={`h-8 w-8 p-0 rounded transition-colors cursor-pointer flex items-center justify-center ${
            isHidden
              ? "bg-[#e6f2ff] text-blue-500 border"
              : "bg-[#F5F5F5] hover:bg-[#EEEEEE] border"
          }`}
          title={isHidden ? "Show in Timetable" : "Hide in Timetable"}
        >
          {isHidden ? (
            <Eye className="h-3 w-3" />
          ) : (
            <EyeOff className="h-3 w-3" />
          )}
        </button>
      </div>
    </div>
  );
};

// Add this helper function
const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    
    img.src = URL.createObjectURL(file);
  });
};
