import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { z } from "zod";
import { backgroundImageStorage } from "../lib/indexeddb-storage";
import { safeLocalStorage } from "../lib/safe-local-storage";

// Action definitions following the tool pattern
const settingsActions = {
  setTextSize: {
    description: 'Set the text size for timetable items',
    inputSchema: z.object({
      size: z.number().min(6).max(24).describe("Text size in pixels")
    }),
    execute: async ({ size }: { size: number }) => {
      return { success: true, textSize: size };
    }
  },
  setTextColor: {
    description: 'Set the text color for timetable items',
    inputSchema: z.object({
      color: z.string().describe("Text color (hex, rgb, or named color)")
    }),
    execute: async ({ color }: { color: string }) => {
      return { success: true, textColor: color };
    }
  },
  setOpacity: {
    description: 'Set the opacity for timetable items',
    inputSchema: z.object({
      opacity: z.number().min(0).max(100).describe("Opacity percentage (0-100)")
    }),
    execute: async ({ opacity }: { opacity: number }) => {
      return { success: true, opacity };
    }
  },
  setAbbreviationFormat: {
    description: 'Set the abbreviation format for course names',
    inputSchema: z.object({
      format: z.enum(['one', 'two', 'three', 'full']).describe("Abbreviation format")
    }),
    execute: async ({ format }: { format: string }) => {
      return { success: true, abbreviationFormat: format };
    }
  },
  setVisibilitySettings: {
    description: 'Set visibility settings for timetable elements',
    inputSchema: z.object({
      hideCourseCode: z.boolean().optional().describe("Hide course code"),
      hideCourseName: z.boolean().optional().describe("Hide course name"),
      hideTime: z.boolean().optional().describe("Hide time"),
      hideDays: z.boolean().optional().describe("Hide days")
    }),
    execute: async ({ hideCourseCode, hideCourseName, hideTime, hideDays }: { hideCourseCode?: boolean; hideCourseName?: boolean; hideTime?: boolean; hideDays?: boolean }) => {
      const result: any = { success: true };
      if (hideCourseCode !== undefined) result.hideCourseCode = hideCourseCode;
      if (hideCourseName !== undefined) result.hideCourseName = hideCourseName;
      if (hideTime !== undefined) result.hideTime = hideTime;
      if (hideDays !== undefined) result.hideDays = hideDays;
      return result;
    }
  },
  setBackgroundSettings: {
    description: 'Set background image and positioning settings',
    inputSchema: z.object({
      backgroundImage: z.string().nullable().optional().describe("Background image URL or null to remove"),
      backgroundSize: z.number().min(10).optional().describe("Background size percentage"),
      backgroundPositionX: z.number().min(0).max(100).optional().describe("Background X position percentage"),
      backgroundPositionY: z.number().min(0).max(100).optional().describe("Background Y position percentage"),
      backgroundRotation: z.number().min(-180).max(180).optional().describe("Background rotation in degrees")
    }),
    execute: async ({ backgroundImage, backgroundSize, backgroundPositionX, backgroundPositionY, backgroundRotation }: { backgroundImage?: string | null; backgroundSize?: number; backgroundPositionX?: number; backgroundPositionY?: number; backgroundRotation?: number }) => {
      const result: any = { success: true };
      if (backgroundImage !== undefined) {
        result.backgroundImage = backgroundImage;
        if (backgroundImage) {
          await backgroundImageStorage.saveImage('background', backgroundImage);
        } else {
          await backgroundImageStorage.removeImage('background');
        }
      }
      if (backgroundSize !== undefined) result.backgroundSize = backgroundSize;
      if (backgroundPositionX !== undefined) result.backgroundPositionX = backgroundPositionX;
      if (backgroundPositionY !== undefined) result.backgroundPositionY = backgroundPositionY;
      if (backgroundRotation !== undefined) result.backgroundRotation = backgroundRotation;
      return result;
    }
  },
  setFontSettings: {
    description: 'Set font settings for specific elements',
    inputSchema: z.object({
      element: z.enum(['courseCode', 'courseName', 'time', 'days']).describe("Element to modify"),
      fontFamily: z.string().optional().describe("Font family"),
      fontSize: z.number().min(6).max(24).optional().describe("Font size"),
      fontWeight: z.union([z.string(), z.number()]).optional().describe("Font weight"),
      fontStyle: z.enum(['normal', 'italic', 'oblique']).optional().describe("Font style"),
      fontVariant: z.enum(['normal', 'small-caps']).optional().describe("Font variant"),
      lineHeight: z.number().min(0.5).max(3).optional().describe("Line height"),
      letterSpacing: z.number().min(-5).max(10).optional().describe("Letter spacing"),
      wordSpacing: z.number().min(-10).max(20).optional().describe("Word spacing"),
      textTransform: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']).optional().describe("Text transform"),
      color: z.string().optional().describe("Text color"),
      textAlign: z.enum(['left', 'center', 'right', 'justify']).optional().describe("Text alignment")
    }),
    execute: async ({ element, ...fontProps }: { element: string; [key: string]: any }) => {
      return { success: true, element, fontSettings: fontProps };
    }
  }
};

interface SettingsState {
  courseCode: any;
  courseName: any;
  time: any;
  days: any;
  textSize: number;
  textColor: string;
  opacity: number;
  abbreviationFormat: string;
  hideCourseCode: boolean;
  hideCourseName: boolean;
  hideTime: boolean;
  hideDays: boolean;
  backgroundImage: string | null;
  backgroundSize: number;
  backgroundPositionX: number;
  backgroundPositionY: number;
  backgroundRotation: number;
  isCustomizingWallpaper: boolean;
  selectedWallpaper: string;
  websiteBackgroundImage: string;
  // Action methods following the tool pattern
  executeAction: (actionName: string, params: any) => Promise<any>;
  // Legacy methods for backward compatibility
  setOpacity: (opacity: number) => void;
  setTextSize: (size: number) => void;
  setTextColor: (textColor: string) => void;
  setAbbreviationFormat: (format: string) => void;
  setCourseCodeFontFamily: (fontFamily: string) => void;
  setCourseCodeFontSize: (fontSize: number) => void;
  setCourseCodeFontWeight: (fontWeight: string | number) => void;
  setCourseCodeFontStyle: (fontStyle: "normal" | "italic" | "oblique") => void;
  setCourseCodeFontVariant: (fontVariant: "normal" | "small-caps") => void;
  setCourseCodeLineHeight: (lineHeight: number) => void;
  setCourseCodeLetterSpacing: (letterSpacing: number) => void;
  setCourseCodeWordSpacing: (wordSpacing: number) => void;
  setCourseCodeTextTransform: (
    textTransform: "none" | "uppercase" | "lowercase" | "capitalize"
  ) => void;
  setCourseCodeColor: (color: string) => void;
  setCourseNameFontFamily: (fontFamily: string) => void;
  setCourseNameFontSize: (fontSize: number) => void;
  setCourseNameFontWeight: (fontWeight: string | number) => void;
  setCourseNameFontStyle: (fontStyle: "normal" | "italic" | "oblique") => void;
  setCourseNameFontVariant: (fontVariant: "normal" | "small-caps") => void;
  setCourseNameLineHeight: (lineHeight: number) => void;
  setCourseNameLetterSpacing: (letterSpacing: number) => void;
  setCourseNameWordSpacing: (wordSpacing: number) => void;
  setCourseNameTextTransform: (
    textTransform: "none" | "uppercase" | "lowercase" | "capitalize"
  ) => void;
  setCourseNameColor: (color: string) => void;
  setCourseCodeTextAlign: (textAlign: "left" | "center" | "right" | "justify") => void;
  setCourseNameTextAlign: (textAlign: "left" | "center" | "right" | "justify") => void;
  // Time settings
  setTimeFontFamily: (fontFamily: string) => void;
  setTimeFontSize: (fontSize: number) => void;
  setTimeFontWeight: (fontWeight: string | number) => void;
  setTimeFontStyle: (fontStyle: "normal" | "italic" | "oblique") => void;
  setTimeFontVariant: (fontVariant: "normal" | "small-caps") => void;
  setTimeLineHeight: (lineHeight: number) => void;
  setTimeLetterSpacing: (letterSpacing: number) => void;
  setTimeWordSpacing: (wordSpacing: number) => void;
  setTimeTextTransform: (
    textTransform: "none" | "uppercase" | "lowercase" | "capitalize"
  ) => void;
  setTimeColor: (color: string) => void;
  setTimeTextAlign: (textAlign: "left" | "center" | "right" | "justify") => void;
  // Days settings
  setDaysFontFamily: (fontFamily: string) => void;
  setDaysFontSize: (fontSize: number) => void;
  setDaysFontWeight: (fontWeight: string | number) => void;
  setDaysFontStyle: (fontStyle: "normal" | "italic" | "oblique") => void;
  setDaysFontVariant: (fontVariant: "normal" | "small-caps") => void;
  setDaysLineHeight: (lineHeight: number) => void;
  setDaysLetterSpacing: (letterSpacing: number) => void;
  setDaysWordSpacing: (wordSpacing: number) => void;
  setDaysTextTransform: (
    textTransform: "none" | "uppercase" | "lowercase" | "capitalize"
  ) => void;
  setDaysColor: (color: string) => void;
  setDaysTextAlign: (textAlign: "left" | "center" | "right" | "justify") => void;
  setHideCourseCode: (hide: boolean) => void;
  setHideCourseName: (hide: boolean) => void;
  setHideTime: (hide: boolean) => void;
  setHideDays: (hide: boolean) => void;
  setBackgroundImage: (backgroundImage: string | null) => void;
  loadBackgroundImage: () => Promise<void>;
  setBackgroundSize: (size: number) => void;
  setBackgroundPositionX: (x: number) => void;
  setBackgroundPositionY: (y: number) => void;
  setBackgroundRotation: (rotation: number) => void;
  setIsCustomizingWallpaper: (isCustomizingWallpaper: boolean) => void;
  setSelectedWallpaper: (wallpaper: string) => void;
  setWebsiteBackgroundImage: (image: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      textSize: 9,
      textColor: "black",
      opacity: 100,
      abbreviationFormat: 'two',
      hideCourseCode: false,
      hideCourseName: false,
      hideTime: false,
      hideDays: false,
      backgroundImage: "/wallpaper.jpeg",
      backgroundSize: 300,
      backgroundPositionX: 50,
      backgroundPositionY: 50,
      backgroundRotation: 0,
      isCustomizingWallpaper: false,
      selectedWallpaper: "wallpaper",
      websiteBackgroundImage: "/wallpaper.jpeg",
      courseCode: {
        fontFamily: "Geist Sans",
        fontSize: 9,
        fontWeight: "bold",
        fontStyle: "normal",
        fontVariant: "normal",
        lineHeight: 1.5,
        letterSpacing: 0,
        wordSpacing: 0,
        textTransform: "uppercase",
        color: "black",
        textAlign: "left",
      },
      courseName: {
        fontFamily: "Geist Sans",
        fontSize: 9,
        fontWeight: "normal",
        fontStyle: "normal",
        fontVariant: "normal",
        lineHeight: 1.5,
        letterSpacing: 0,
        wordSpacing: 0,
        textTransform: "capitalize",
        color: "black",
        textAlign: "left",
      },
      time: {
        fontFamily: "Geist Sans",
        fontSize: 8,
        fontWeight: "normal",
        fontStyle: "normal",
        fontVariant: "normal",
        lineHeight: 1.4,
        letterSpacing: 0,
        wordSpacing: 0,
        textTransform: "none",
        color: "#666666",
        textAlign: "center",
      },
      days: {
        fontFamily: "Geist Sans",
        fontSize: 10,
        fontWeight: "bold",
        fontStyle: "normal",
        fontVariant: "normal",
        lineHeight: 1.3,
        letterSpacing: 0,
        wordSpacing: 0,
        textTransform: "uppercase",
        color: "#333333",
        textAlign: "center",
      },
      // Action executor following the tool pattern
      executeAction: async (actionName: string, params: any) => {
        const action = settingsActions[actionName as keyof typeof settingsActions];
        if (!action) {
          throw new Error(`Unknown action: ${actionName}`);
        }
        
        try {
          // Validate input using the schema
          const validatedParams = action.inputSchema.parse(params);
          
          // Execute the action
          const result = await action.execute(validatedParams);
          
          // Update the store state based on the result
          if (result.success) {
            const stateUpdate: any = {};
            
            // Handle different action results
            if (result.textSize !== undefined) stateUpdate.textSize = result.textSize;
            if (result.textColor !== undefined) stateUpdate.textColor = result.textColor;
            if (result.opacity !== undefined) stateUpdate.opacity = result.opacity;
            if (result.abbreviationFormat !== undefined) stateUpdate.abbreviationFormat = result.abbreviationFormat;
            if (result.hideCourseCode !== undefined) stateUpdate.hideCourseCode = result.hideCourseCode;
            if (result.hideCourseName !== undefined) stateUpdate.hideCourseName = result.hideCourseName;
            if (result.hideTime !== undefined) stateUpdate.hideTime = result.hideTime;
            if (result.hideDays !== undefined) stateUpdate.hideDays = result.hideDays;
            if (result.backgroundImage !== undefined) stateUpdate.backgroundImage = result.backgroundImage;
            if (result.backgroundSize !== undefined) stateUpdate.backgroundSize = result.backgroundSize;
            if (result.backgroundPositionX !== undefined) stateUpdate.backgroundPositionX = result.backgroundPositionX;
            if (result.backgroundPositionY !== undefined) stateUpdate.backgroundPositionY = result.backgroundPositionY;
            if (result.backgroundRotation !== undefined) stateUpdate.backgroundRotation = result.backgroundRotation;
            
            // Handle font settings
            if (result.element && result.fontSettings) {
              const currentState = get();
              const elementState = currentState[result.element as keyof typeof currentState];
              if (elementState && typeof elementState === 'object') {
                stateUpdate[result.element] = { ...elementState, ...result.fontSettings };
              }
            }
            
            if (Object.keys(stateUpdate).length > 0) {
              set(stateUpdate);
            }
          }
          
          return result;
        } catch (error) {
          console.error(`Action ${actionName} failed:`, error);
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      },
      
      // Legacy methods for backward compatibility
      setBackgroundImage: async (backgroundImage: string | null) => {
        const { executeAction } = get();
        await executeAction('setBackgroundSettings', { backgroundImage });
      },
      loadBackgroundImage: async () => {
        try {
          const savedImage = await backgroundImageStorage.getImage('background');
          if (savedImage) {
            set({ backgroundImage: savedImage.data });
          }
        } catch (error) {
          console.error('Failed to load background image from IndexedDB:', error);
        }
      },
      setTextSize: (textSize) => {
        const { executeAction } = get();
        executeAction('setTextSize', { size: textSize });
      },
      setTextColor: (textColor: string) => {
        const { executeAction } = get();
        executeAction('setTextColor', { color: textColor });
      },
      setOpacity: (opacity: any) => {
        const { executeAction } = get();
        executeAction('setOpacity', { opacity });
      },
      setAbbreviationFormat: (format: string) => {
        const { executeAction } = get();
        executeAction('setAbbreviationFormat', { format });
      },
      setCourseCodeFontFamily: (fontFamily: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'courseCode', fontFamily });
      },
      setCourseCodeFontSize: (fontSize: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'courseCode', fontSize });
      },
      setCourseCodeFontWeight: (fontWeight: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'courseCode', fontWeight });
      },
      setCourseCodeFontStyle: (fontStyle: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'courseCode', fontStyle });
      },
      setCourseCodeFontVariant: (fontVariant: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'courseCode', fontVariant });
      },
      setCourseCodeLineHeight: (lineHeight: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'courseCode', lineHeight });
      },
      setCourseCodeLetterSpacing: (letterSpacing: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'courseCode', letterSpacing });
      },
      setCourseCodeWordSpacing: (wordSpacing: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'courseCode', wordSpacing });
      },
      setCourseCodeTextTransform: (textTransform: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'courseCode', textTransform });
      },
      setCourseCodeColor: (color: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'courseCode', color });
      },
      setCourseNameFontFamily: (fontFamily: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'courseName', fontFamily });
      },
      setCourseNameFontSize: (fontSize: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'courseName', fontSize });
      },
      setCourseNameFontWeight: (fontWeight: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'courseName', fontWeight });
      },
      setCourseNameFontStyle: (fontStyle: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'courseName', fontStyle });
      },
      setCourseNameFontVariant: (fontVariant: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'courseName', fontVariant });
      },
      setCourseNameLineHeight: (lineHeight: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'courseName', lineHeight });
      },
      setCourseNameLetterSpacing: (letterSpacing: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'courseName', letterSpacing });
      },
      setCourseNameWordSpacing: (wordSpacing: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'courseName', wordSpacing });
      },
      setCourseNameTextTransform: (textTransform: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'courseName', textTransform });
      },
      setCourseNameColor: (color: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'courseName', color });
      },
      setCourseCodeTextAlign: (textAlign: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'courseCode', textAlign });
      },
      setCourseNameTextAlign: (textAlign: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'courseName', textAlign });
      },
      // Time setter functions
      setTimeFontFamily: (fontFamily: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'time', fontFamily });
      },
      setTimeFontSize: (fontSize: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'time', fontSize });
      },
      setTimeFontWeight: (fontWeight: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'time', fontWeight });
      },
      setTimeFontStyle: (fontStyle: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'time', fontStyle });
      },
      setTimeFontVariant: (fontVariant: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'time', fontVariant });
      },
      setTimeLineHeight: (lineHeight: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'time', lineHeight });
      },
      setTimeLetterSpacing: (letterSpacing: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'time', letterSpacing });
      },
      setTimeWordSpacing: (wordSpacing: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'time', wordSpacing });
      },
      setTimeTextTransform: (textTransform: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'time', textTransform });
      },
      setTimeColor: (color: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'time', color });
      },
      setTimeTextAlign: (textAlign: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'time', textAlign });
      },
      // Days setter functions
      setDaysFontFamily: (fontFamily: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'days', fontFamily });
      },
      setDaysFontSize: (fontSize: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'days', fontSize });
      },
      setDaysFontWeight: (fontWeight: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'days', fontWeight });
      },
      setDaysFontStyle: (fontStyle: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'days', fontStyle });
      },
      setDaysFontVariant: (fontVariant: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'days', fontVariant });
      },
      setDaysLineHeight: (lineHeight: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'days', lineHeight });
      },
      setDaysLetterSpacing: (letterSpacing: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'days', letterSpacing });
      },
      setDaysWordSpacing: (wordSpacing: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'days', wordSpacing });
      },
      setDaysTextTransform: (textTransform: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'days', textTransform });
      },
      setDaysColor: (color: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'days', color });
      },
      setDaysTextAlign: (textAlign: any) => {
        const { executeAction } = get();
        executeAction('setFontSettings', { element: 'days', textAlign });
      },
      setHideCourseCode: (hideCourseCode: boolean) => {
        const { executeAction } = get();
        executeAction('setVisibilitySettings', { hideCourseCode });
      },
      setHideCourseName: (hideCourseName: boolean) => {
        const { executeAction } = get();
        executeAction('setVisibilitySettings', { hideCourseName });
      },
      setHideTime: (hideTime: boolean) => {
        const { executeAction } = get();
        executeAction('setVisibilitySettings', { hideTime });
      },
      setHideDays: (hideDays: boolean) => {
        const { executeAction } = get();
        executeAction('setVisibilitySettings', { hideDays });
      },
      setIsCustomizingWallpaper: (isCustomizingWallpaper: boolean) => set({ isCustomizingWallpaper }),
      setBackgroundSize: (backgroundSize: number) => {
        const { executeAction } = get();
        executeAction('setBackgroundSettings', { backgroundSize });
      },
      setBackgroundPositionX: (backgroundPositionX: number) => {
        const { executeAction } = get();
        executeAction('setBackgroundSettings', { backgroundPositionX });
      },
      setBackgroundPositionY: (backgroundPositionY: number) => {
        const { executeAction } = get();
        executeAction('setBackgroundSettings', { backgroundPositionY });
      },
      setBackgroundRotation: (backgroundRotation: number) => {
        const { executeAction } = get();
        executeAction('setBackgroundSettings', { backgroundRotation });
      },
      setSelectedWallpaper: (selectedWallpaper: string) => set({ selectedWallpaper }),
      setWebsiteBackgroundImage: (websiteBackgroundImage: string) => set({ websiteBackgroundImage }),
    }),
    {
      name: 'timetable-settings',
      storage: createJSONStorage(() => safeLocalStorage),
    }
  )
);
