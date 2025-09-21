import {
  Geist,
  Inter,
  Plus_Jakarta_Sans,
  Space_Grotesk,
} from "next/font/google";
import { Analytics } from '@vercel/analytics/next';
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { IndexedDBProvider } from "@/components/indexeddb-provider";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Schedule Maker | Automatic Timetable Generator & Formatter",
  description:
    "Free automatic schedule formatter and timetable generator for students. Create, format, and organize your class schedules with our semi-automatic schedule maker. Generate professional timetables instantly with our easy-to-use schedule maker tool.",
  keywords: [
    "Automatic IIUM Schedule Formatter",
    "IIUM Schedule Generator",
    "SemiAutomatic IIUM Schedule Maker",
    "IIUM Schedule Maker",
    "iium-schedule",
    "schedule maker",
    "timetable maker",
    "timetable generator",
    "uia schedule maker",
    "IIUM timetable",
    "International Islamic University Malaysia schedule",
    "student schedule planner",
    "class timetable generator",
    "university schedule formatter",
    "academic timetable maker",
    "IIUM class scheduler",
  ].join(", "),
  authors: [{ name: "Azy Dev" }],
  creator: "Azy Dev",
  publisher: "Azy Dev",
  category: "Education",
};

// Remove 'export' from these font declarations
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jakarta.variable} ${spaceGrotesk.variable} ${geist.variable} font-geist`}
      >
        <IndexedDBProvider>
          {children}
        </IndexedDBProvider>
        <Analytics />
        <Toaster />
      </body>
    </html>
  );
}
