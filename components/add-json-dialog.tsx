"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useCourseStore } from "@/stores/courseStore";
import { createCourseForCurrentTimetable } from "@/lib/course-timetable-helpers";
import moment from "moment";
import { toast } from "sonner";
import validator from "is-my-json-valid";
import { default_courses } from "@/utils/example_courses";
const DAYS_OF_WEEK = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export default function AddJsonDialog({ isOpen, onClose, courseId }: any) {
  const { courses, updateCourse, resetCourses } = useCourseStore();
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    sessions: [
      { days: [], startTime: "08:00", endTime: "09:00", location: "" },
    ],
    color: "",
  });
  const [jsonInput, setJsonInput] = useState("");
  const [timeErrors, setTimeErrors]: any = useState({});


  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      sessions: [
        { days: [], startTime: "08:00", endTime: "09:00", location: "" },
      ],
      color: "",
    });
    setJsonInput("");
    setTimeErrors({});
  };

  const loadDefaultCourses = () => {
    setJsonInput(JSON.stringify(default_courses, null, 2));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const errors: any = {};
    let hasError = false;

    formData.sessions.forEach((s: any, i: number) => {
      if (!moment(s.startTime, "HH:mm").isBefore(moment(s.endTime, "HH:mm"))) {
        errors[i] = "Start time must be before end time.";
        hasError = true;
      }
    });

    setTimeErrors(errors);

    if (hasError) return;

    if (courseId) {
      updateCourse({ ...formData, id: courseId });
    } else {
      try {
        await createCourseForCurrentTimetable(formData);
        toast.success(`Successfully added ${formData.code} - ${formData.name}!`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to add course';
        toast.error(`Failed to add course: ${errorMessage}`);
        return;
      }
    }
    resetForm();
    onClose();
  };

  const courseSchema: any = {
    type: ["array"],
    items: {
      type: ["object"],
      required: ["code", "name", "color", "sessions"],
      properties: {
        code: { type: ["string"] },
        name: { type: ["string"] },
        color: { type: ["string"] },
        sessions: {
          type: ["array"],
          items: {
            type: ["object"],
            required: ["days", "startTime", "endTime", "location"],
            properties: {
              days: {
                type: ["array"],
                items: { type: ["string"] },
              },
              startTime: { type: ["string"] },
              endTime: { type: ["string"] },
              location: { type: ["string"] },
            },
          },
        },
      },
    },
  };

  const validateJsonInput = (jsonInput: string) => {
    try {
      const parsed = JSON.parse(jsonInput);
      const validate = validator(courseSchema, { verbose: true });

      if (validate(parsed)) {
        console.log("✅ Valid JSON Array:", parsed);
        toast.success("Valid JSON", {
          description: "All course objects are valid.",
        });
      } else {
        console.error("❌ Validation Errors:", validate.errors);
        toast.error("Invalid JSON Structure", {
          description: "Check required fields in the array of course objects.",
        });
      }
    } catch (err) {
      console.error("❌ JSON Parse Error:", err);
      toast.error("Invalid JSON", {
        description: "JSON is not parsable.",
      });
    }
  };

  const importCoursesFromJson = async (jsonInput: string) => {
  try {
    const parsed = JSON.parse(jsonInput);
    console.log(parsed);

    const validate = validator(courseSchema, { verbose: true });

    if (!validate(parsed)) {
      console.error("Schema validation errors:", validate.errors);
      toast.error("Invalid Structure", {
        description: "JSON does not match the required course schema.",
      });
      return;
    }

    const confirmReset = window.confirm(
      "This will remove all current courses and replace them with the imported data. Continue?"
    );

    if (!confirmReset) return;

    resetCourses();

    let importedCount = 0;
    let errorCount = 0;

    for (const [i, course] of (parsed as any[]).entries()) {
      let hasError = false;

      for (const [j, session] of course.sessions.entries()) {
        if (
          !moment(session.startTime, "HH:mm").isBefore(
            moment(session.endTime, "HH:mm")
          )
        ) {
          toast.error(`Session ${j + 1} in course ${i + 1} has invalid time`, {
            description: "Start time must be before end time.",
          });
          hasError = true;
          break;
        }
      }

      if (!hasError) {
        try {
          await createCourseForCurrentTimetable({ ...course });
          importedCount++;
        } catch (error) {
          errorCount++;
          console.error(`Failed to import course ${course.code}:`, error);
        }
      }
    }

    if (errorCount === 0 && importedCount > 0) {
      toast.success("Import Success", {
        description: `${importedCount} course(s) imported successfully.`,
      });
    } else if (importedCount > 0) {
      toast.warning(`Imported ${importedCount} course(s), ${errorCount} failed.`);
    }
  } catch (err) {
    console.error("Parse error:", err);
    toast.error("Import Failed", {
      description: "JSON is not valid or parsable.",
    });
  }
};


  useEffect(() => {
    if (courseId) {
      const course = courses.find((course: any) => course.id === courseId);
      if (course) {
        setFormData({
          code: course.code,
          name: course.name,
          sessions: course.sessions,
          color: course.color,
        });
      }
    } else {
      resetForm();
    }
  }, [courseId, courses]);

  return (
    <Dialog modal={false} open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] h-[590px] flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base font-semibold">
            Paste Json Object
          </DialogTitle>
          <DialogDescription>
            Paste Json object based on the following format to bulk <br />{" "}
            import your courses. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col overflow-hidden p-2 overflow-y-auto"
        >
          <div className="space-y-2">
            <Textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={`{
  "code": "INFO 3205",
  "name": "INFORMATION VISUALIZATION",
  "color": "#FFB3BA",
  "sessions": [
    {
      "days": ["MON", "WED"],
      "startTime": "10:00",
      "endTime": "11:20",
      "location": "ICT CIT A CLASS 1 LR-C"
    }
  ]
}`}
              className="min-h-[150px] font-mono text-sm resize-none bg-white"
            />
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={loadDefaultCourses}
              >
                Load Example Courses
              </Button>
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              resetForm();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => validateJsonInput(jsonInput)}
          >
            Validate
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs"
            onClick={() => importCoursesFromJson(jsonInput)}
          >
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

