import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useCourseStore } from "@/stores/courseStore";
import { useTimetableStore } from "@/stores/timetableStore";
import { createCourseForCurrentTimetable } from "@/lib/course-timetable-helpers";
import { toast } from "sonner";
import moment from "moment";

const DAYS_OF_WEEK = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export default function CourseDialog({ isOpen, onClose, courseId }: any) {
  const { courses, updateCourse } = useCourseStore();
  const { activeTimetableId } = useTimetableStore();
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    sessions: [
      { days: [], startTime: "08:00", endTime: "09:00", location: "" },
    ],
    color: "",
  });

  const handleInputChange = (field: any, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSessionChange = (index: any, field: any, value: any) => {
    setFormData((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session, i) =>
        i === index ? { ...session, [field]: value } : session
      ),
    }));
  };

  const addSession = () => {
    setFormData((prev) => ({
      ...prev,
      sessions: [
        ...prev.sessions,
        { days: [], startTime: "08:00", endTime: "09:00", location: "" },
      ],
    }));
  };

  const removeSession = (index: any) => {
    setFormData((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((_, i) => i !== index),
    }));
  };

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      sessions: [
        { days: [], startTime: "08:00", endTime: "09:00", location: "" },
      ],
      color: "",
    });
  };

  const [timeErrors, setTimeErrors]: any = useState({});

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
      if (!activeTimetableId) {
        toast.error('No active timetable found');
        return;
      }
      // Add session_id to sessions for updateCourse
      const formDataWithSessionIds = {
        ...formData,
        sessions: formData.sessions.map((session: any) => ({
          ...session,
          session_id: session.session_id || crypto.randomUUID()
        }))
      };
      updateCourse(activeTimetableId, formData.code, formDataWithSessionIds);
      toast.success(`Successfully updated ${formData.code} - ${formData.name}!`);
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

  useEffect(() => {
    if (courseId) {
      const course = courses.find((course: any) => course.id === courseId);
      if (course) {
        setFormData({
          code: course.code,
          name: course.name,
          sessions: course.sessions.map((session: any) => ({
            ...session,
            days: Array.isArray(session.days) ? session.days : []
          })),
          color: course.color,
        });
      }
    } else {
      resetForm();
    }
  }, [courseId, courses]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] h-full flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base font-semibold">
            {courseId ? "Edit Course" : "Add Course"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col overflow-hidden p-3 overflow-y-auto"
        >
          <div className="flex-1 pr-2 space-y-4">
            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="w-1/2 space-y-1.5">
                  <Label className="text-sm">Course Code</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => handleInputChange("code", e.target.value)}
                    className="h-8 text-sm mt-1"
                    required
                  />
                </div>

                <div className="w-1/2 space-y-1.5">
                  <Label className="text-sm">Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="relative w-full h-8 rounded-md border cursor-pointer">
                      <div
                        className="absolute inset-0 rounded-md border shadow-xs"
                        style={{ backgroundColor: formData.color || "#3b82f6" }}
                      />
                      <input
                        type="color"
                        value={formData.color || "#3b82f6"}
                        onChange={(e) =>
                          handleInputChange("color", e.target.value)
                        }
                        className="opacity-0 w-full h-full cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Course Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="h-8 text-sm mt-1"
                  required
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm">Sessions</Label>
                <div className="space-y-2 mt-1">
                  {formData.sessions.map((session: any, index: any) => (
                    <div
                      key={index}
                      className="p-4 space-y-2 rounded-md bg-gray-100 "
                    >
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Days</Label>
                          <div className="flex flex-wrap gap-4 mt-2">
                            {DAYS_OF_WEEK.map((day) => (
                              <div
                                key={day}
                                className="flex items-center gap-2"
                              >
                                <input
                                  type="checkbox"
                                  checked={Array.isArray(session.days) && session.days.includes(day)}
                                  onChange={(e) => {
                                    const currentDays = Array.isArray(session.days) ? session.days : [];
                                    const newDays = e.target.checked
                                      ? [...currentDays, day]
                                      : currentDays.filter(
                                          (d: any) => d !== day
                                        );
                                    handleSessionChange(index, "days", newDays);
                                  }}
                                  className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                                />
                                <Label className="text-sm text-gray-700">
                                  {day.charAt(0).toUpperCase() +
                                    day.slice(1).toLowerCase()}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Start Time</Label>
                            <Input
                              type="time"
                              value={session.startTime}
                              onChange={(e) =>
                                handleSessionChange(
                                  index,
                                  "startTime",
                                  e.target.value
                                )
                              }
                              className="h-8 text-xs bg-white mt-1"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">End Time</Label>
                            <Input
                              type="time"
                              value={session.endTime}
                              onChange={(e) =>
                                handleSessionChange(
                                  index,
                                  "endTime",
                                  e.target.value
                                )
                              }
                              className="h-8 text-xs bg-white mt-1"
                            />
                          </div>
                          {timeErrors[index] && (
                            <div className="col-span-2 text-red-500 text-xs">
                              {timeErrors[index]}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Location</Label>
                          <Input
                            value={session.location}
                            onChange={(e) =>
                              handleSessionChange(
                                index,
                                "location",
                                e.target.value
                              )
                            }
                            placeholder="Building/room"
                            className="h-8 text-xs bg-white mt-1"
                          />
                        </div>
                      </div>

                      {formData.sessions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-gray-700 hover:bg-gray-200 cursor-pointer"
                          onClick={() => removeSession(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs border-dashed hover:border-solid cursor-pointer"
                  onClick={addSession}
                >
                  <PlusIcon className="w-3 h-3 mr-1.5" />
                  Add Session
                </Button>
              </div>
            </div>
          </div>

          <div className="shrink-0 pt-4 mt-4 border-t">
            <div className="flex justify-end gap-2">
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
              <Button type="submit" size="sm" className="h-8 text-xs">
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
