import React, { useMemo, useState, useRef, useEffect } from "react";
import { format, addMinutes, parse, differenceInMinutes } from "date-fns";
import CourseDialog from "@/components/course-dialog";
import { useSettingsStore } from "@/stores/settingsStore";
import { useCourseStore } from "@/stores/courseStore";
import { useTimetableStore } from "@/stores/timetableStore";
import * as htmlToImage from "html-to-image";
import { useScreenshot } from "@/hooks/use-screenshot";

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const TIME_SLOT_COLORS = [
  "#f0f4f8",
  "#e1e8f0",
  "#d2dce7 loadTimetables,",
  "#c3d0de",
];

const Timetable = () => {
  const { getCourses } = useCourseStore();
  const { activeTimetableId } = useTimetableStore();
  const courses = getCourses(activeTimetableId || "");

  // Debug: Log when courses change
  useEffect(() => {
    console.log("Timetable component: courses updated", {
      courseCount: courses?.length || 0,
      courses: courses,
    });
  }, [courses]);

  const [selectedCourseIndex, setSelectedCourseIndex] = useState<any>(null);
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState<any>(false);
  const timetableRef = useRef<HTMLDivElement>(null);
  const { captureElement, downloadImage, copyToClipboard } = useScreenshot();

  const handleScreenshot = async (format: "png" | "jpeg" | "svg" = "png") => {
    if (!timetableRef.current) return;

    try {
      const dataUrl = await captureElement(timetableRef.current, {
        format,
        quality: format === "jpeg" ? 0.9 : 1.0,
        pixelRatio: 3, // Higher quality
      });

      const filename = `timetable-${
        new Date().toISOString().split("T")[0]
      }.${format}`;
      downloadImage(dataUrl, filename);
    } catch (error) {
      console.error("Screenshot failed:", error);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!timetableRef.current) return;

    const success = await copyToClipboard(timetableRef.current);
    if (success) {
      // Show success message
      console.log("Copied to clipboard!");
    }
  };

  const {
    textSize,
    textColor,
    opacity,
    abbreviationFormat,
    hideCourseCode,
    hideCourseName,
    hideTime,
    hideDays,
    courseCode,
    courseName,
    time,
    days,
    backgroundImage,
    backgroundSize,
    backgroundPositionX,
    backgroundPositionY,
    backgroundRotation,
  } = useSettingsStore();

  const abbreviationFormats = {
    full: {
      MON: "Monday",
      TUE: "Tuesday",
      WED: "Wednesday",
      THU: "Thursday",
      FRI: "Friday",
      SAT: "Saturday",
      SUN: "Sunday",
    },
    three: {
      MON: "Mon",
      TUE: "Tue",
      WED: "Wed",
      THU: "Thu",
      FRI: "Fri",
      SAT: "Sat",
      SUN: "Sun",
    },
    two: {
      MON: "Mo",
      TUE: "Tu",
      WED: "We",
      THU: "Th",
      FRI: "Fr",
      SAT: "Sa",
      SUN: "Su",
    },
    single: {
      MON: "M",
      TUE: "T",
      WED: "W",
      THU: "R",
      FRI: "F",
      SAT: "S",
      SUN: "U",
    },
  };

  const timetableData = useMemo<any>(() => {
    const flattenedCourses = courses.flatMap((course: any) =>
      course.sessions.map((session: any) => ({
        ...course,
        ...session,
      }))
    );

    if (!flattenedCourses.length) {
      return {
        timeSlots: [
          "08:00",
          "08:30",
          "09:00",
          "09:30",
          "10:00",
          "10:30",
          "11:00",
          "11:30",
          "12:00",
          "12:30",
          "13:00",
          "13:30",
          "14:00",
          "14:30",
          "15:00",
          "15:30",
          "16:00",
          "16:30",
          "17:00",
          "17:30",
        ],
        startTime: parse("08:00", "HH:mm", new Date()),
        endTime: parse("17:30", "HH:mm", new Date()),
        subjectColors: {},
        totalMinutes: 20 * 30,
        activeDays: ["MON", "TUE", "WED", "THU", "FRI"],
        hasData: false,
      };
    }

    const sortedCourses = [...flattenedCourses].sort(
      (a: any, b: any) =>
        parse(a.startTime, "HH:mm", new Date()).getTime() -
        parse(b.startTime, "HH:mm", new Date()).getTime()
    );

    const startTime = parse(sortedCourses[0].startTime, "HH:mm", new Date());
    const endTime = parse(
      sortedCourses[sortedCourses.length - 1].endTime,
      "HH:mm",
      new Date()
    );

    const timeSlots = [];
    for (let time = startTime; time <= endTime; time = addMinutes(time, 30)) {
      timeSlots.push(format(time, "HH:mm"));
    }

    const subjectColors = courses.reduce((acc: any, course: any) => {
      acc[course.code] = course.color;
      return acc;
    }, {});

    const activeDays = Array.from(
      new Set(flattenedCourses.flatMap((course: any) => course.days))
    ).sort((a: any, b: any) => DAYS.indexOf(a) - DAYS.indexOf(b));

    return {
      timeSlots,
      startTime,
      endTime,
      subjectColors,
      totalMinutes: timeSlots.length * 30,
      activeDays,
      hasData: true,
    };
  }, [courses]);

  const {
    timeSlots,
    startTime,
    endTime,
    subjectColors,
    totalMinutes,
    activeDays,
    hasData,
  } = timetableData;

  const getFontClass = (fontFamily: any) => {
    const fontMap: any = {
      "Geist Sans": "font-geist",
      Inter: "font-inter",
      Jakarta: "font-jakarta",
      "Space Grotesk": "font-grotesk",
      Arial: "font-arial",
      "Times New Roman": "font-times",
      Helvetica: "font-helvetica",
      Georgia: "font-georgia",
      Verdana: "font-verdana",
    };

    return fontMap[fontFamily] || "font-sans";
  };

  const renderCourseBlock = (combinedCourse: any, day: any) => {
    const courseStartTime = parse(
      combinedCourse.startTime,
      "HH:mm",
      new Date()
    );
    const courseEndTime = parse(combinedCourse.endTime, "HH:mm", new Date());
    const courseStartOffset = differenceInMinutes(courseStartTime, startTime);
    const courseDuration = differenceInMinutes(courseEndTime, courseStartTime);

    if (isNaN(courseStartOffset) || isNaN(courseDuration)) return null;

    return (
      <div
        key={combinedCourse.session_id}
        onClick={() => {
          setSelectedCourseIndex(combinedCourse.id);
          setIsCourseDialogOpen(true);
        }}
        className="absolute inset-0 text-white overflow-hidden cursor-pointer transition-opacity hover:opacity-90 flex flex-col justify-center items-center text-center"
        style={{
          top: `${(courseStartOffset / totalMinutes) * 100}%`,
          height: `${(courseDuration / totalMinutes) * 100}%`,
          backgroundColor: `${
            subjectColors[combinedCourse.code] || "#808080"
          }${Math.round(opacity * 2.55)
            .toString(16)
            .padStart(2, "0")}`,
        }}
      >
        <div
          style={{
            fontSize: `${textSize}px`,
            lineHeight: 1.1,
            color: `${textColor}`,
            opacity: "100%",
          }}
          className="antialiased absolute top-1 left-1 text-[8px] sm:text-[10px]"
        >
          {combinedCourse.startTime}
        </div>
        {!hideCourseCode && (
          <div
            style={{
              fontSize: `${textSize}px`,
              lineHeight: 1.1,
              color: `${textColor}`,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
              width: "100%",
              padding: "0 4px",
              opacity: "100%",
            }}
            className={`antialiased font-bold ${getFontClass(
              courseCode.fontFamily
            )}`}
          >
            {combinedCourse.code}
          </div>
        )}
        {!hideCourseName && (
          <div
            style={{
              fontSize: `${textSize}px`,
              lineHeight: 1.1,
              color: `${textColor}`,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
              width: "100%",
              padding: "0 4px",
              opacity: "100%",
            }}
            className="antialiased mt-1"
          >
            {combinedCourse.name}
          </div>
        )}
        <div
          style={{
            fontSize: `${textSize}px`,
            lineHeight: 1.1,
            color: `${textColor}`,
            opacity: "100%",
          }}
          className="antialiased absolute bottom-1 right-1 text-[8px] sm:text-[10px]"
        >
          {combinedCourse.endTime}
        </div>
      </div>
    );
  };

  const captureScreenshot = async (
    format: "png" | "jpeg" | "svg" = "png",
    quality: number = 1.0
  ) => {
    if (!timetableRef.current) {
      console.error("Timetable reference not found");
      return;
    }

    try {
      const options = {
        quality,
        pixelRatio: 2, // For high DPI displays
        backgroundColor: "#ffffff",
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
        },
        filter: (node: HTMLElement) => {
          // Exclude certain elements if needed
          return !node.classList?.contains("exclude-from-screenshot");
        },
      };

      let dataUrl: string;

      switch (format) {
        case "png":
          dataUrl = await htmlToImage.toPng(timetableRef.current, options);
          break;
        case "jpeg":
          dataUrl = await htmlToImage.toJpeg(timetableRef.current, options);
          break;
        case "svg":
          dataUrl = await htmlToImage.toSvg(timetableRef.current, options);
          break;
        default:
          dataUrl = await htmlToImage.toPng(timetableRef.current, options);
      }

      // Create download link
      const link = document.createElement("a");
      link.download = `timetable-${
        new Date().toISOString().split("T")[0]
      }.${format}`;
      link.href = dataUrl;
      link.click();

      return dataUrl;
    } catch (error) {
      console.error("Error capturing screenshot:", error);
      throw error;
    }
  };

  // const copyToClipboard = async () => {
  //   try {
  //     const blob = await htmlToImage.toBlob(timetableRef.current!, {
  //       quality: 1.0,
  //       pixelRatio: 2,
  //       backgroundColor: '#ffffff',
  //     });

  //     if (blob) {
  //       await navigator.clipboard.write([
  //         new ClipboardItem({ 'image/png': blob })
  //       ]);
  //       console.log('Screenshot copied to clipboard');
  //     }
  //   } catch (error) {
  //     console.error('Error copying to clipboard:', error);
  //   }
  // };

  return (
    <>
      <div
        ref={timetableRef}
        data-timetable="true"
        className="w-full h-full bg-white shadow-lg overflow-hidden"
        style={{
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background Image Layer */}
        {backgroundImage && (
          <div
            className="absolute overflow-hidden"
            style={{
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              height: "100%",
              zIndex: 0,
              pointerEvents: "none",
            }}
          >
            <img
              src={backgroundImage}
              alt="Background"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: `${backgroundSize}%`,
                height: "auto", // Maintain aspect ratio
                transform: `translate(-50%, -50%) translate(${
                  (backgroundPositionX - 50) * 2
                }%, ${
                  (backgroundPositionY - 50) * 2
                }%) rotate(${backgroundRotation}deg)`,
                transformOrigin: "center",
                objectFit: "contain",
                maxWidth: "none",
                maxHeight: "none",
              }}
            />
          </div>
        )}

        {/* Content Layer */}
        <div className="relative z-10 w-full h-full flex flex-col">
          <div className="flex">
            <div
              className="h-8"
              style={{
                width: `${100 / activeDays.length / 2}%`,
                maxWidth: "15%",
              }}
            ></div>
            {activeDays.map((day: any) => (
              <div
                key={day}
                className="flex-1 text-center text-xs h-8 flex items-center justify-center"
                style={{ width: `${100 / activeDays.length}%` }}
              >
                {abbreviationFormats[
                  abbreviationFormat as keyof typeof abbreviationFormats
                ][day as keyof typeof abbreviationFormats.full] || day}
              </div>
            ))}
          </div>

          <div className="flex grow">
            <div
              className="relative"
              style={{
                width: `${100 / (activeDays.length + 1) / 1.5}%`,
                maxWidth: "15%",
              }}
            >
              {timeSlots.map((time: any, index: any) => (
                <div
                  key={time}
                  className="absolute left-0 right-0 text-right text-xs p-2"
                  style={{
                    top: `${(index / timeSlots.length) * 100}%`,
                    height: `${(1 / timeSlots.length) * 100}%`,
                    color: time.endsWith("30")
                      ? "transparent"
                      : index % 2 === 0
                      ? "#333"
                      : "#666",
                  }}
                >
                  {time.split(":").join("").endsWith("00")
                    ? time.split(":").join("").slice(0, -2)
                    : time.split(":").join("")}
                </div>
              ))}
            </div>

            <div className="grow">
              <div className="h-full relative">
                <div
                  className="absolute inset-0"
                  style={{ height: "100%" }} // Remove overflowY: "auto"
                >
                  {activeDays.map((day: any) => (
                    <div
                      key={day}
                      className="relative h-full"
                      style={{
                        width: `${100 / activeDays.length}%`,
                        float: "left",
                      }}
                    >
                      {courses
                        .flatMap((course: any) =>
                          course.sessions
                            .filter(
                              (session: any) =>
                                Array.isArray(session.days) &&
                                session.days.includes(day)
                            )
                            .map((session: any) => ({ ...course, ...session }))
                        )
                        .map((combinedCourse: any, index: number) => (
                          <React.Fragment
                            key={`${
                              combinedCourse.session_id || combinedCourse.id
                            }-${day}-${index}`}
                          >
                            {renderCourseBlock(combinedCourse, day)}
                          </React.Fragment>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <CourseDialog
          isOpen={isCourseDialogOpen}
          onClose={() => {
            setIsCourseDialogOpen(false);
            setSelectedCourseIndex(null);
          }}
          courseId={selectedCourseIndex}
        />
      </div>
    </>
  );
};

export default Timetable;
