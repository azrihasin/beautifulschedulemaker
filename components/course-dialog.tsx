import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusIcon, Loader2, Trash2 } from "lucide-react";
import { useCourseStore } from "@/stores/courseStore";
import { useTimetableStore } from "@/stores/timetableStore";
import { createCourseForCurrentTimetable } from "@/lib/course-timetable-helpers";
import { toast } from "sonner";
import moment from "moment";

const DAYS_OF_WEEK = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export default function CourseDialog({ isOpen, onClose, courseId }: any) {
  const { courses, updateCourse, deleteCourse } = useCourseStore();
  const { activeTimetableId } = useTimetableStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    sessions: [
      { days: [], startTime: "08:00", endTime: "09:00", location: "" },
    ],
    color: "#3b82f6",
  });

  const handleInputChange = (field: any, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear form error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev: any) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSessionChange = (index: any, field: any, value: any) => {
    setFormData((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session, i) =>
        i === index ? { ...session, [field]: value } : session
      ),
    }));
    
    // Clear session-specific errors when user makes changes
    const errorKey = `session_${index}_${field}`;
    if (formErrors[errorKey]) {
      setFormErrors((prev: any) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
    
    // Clear time errors for this session if they exist
    if (timeErrors[index] && (field === 'startTime' || field === 'endTime')) {
      setTimeErrors((prev: any) => {
        const newErrors = { ...prev };
        delete newErrors[index];
        return newErrors;
      });
    }
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
      color: "#3b82f6",
    });
    setTimeErrors({});
    setFormErrors({});
  };

  const [timeErrors, setTimeErrors]: any = useState({});
  const [formErrors, setFormErrors]: any = useState({});

  const validateForm = useMemo(() => {
    return () => {
      const timeErrors: any = {};
      const formErrors: any = {};
      let hasError = false;

      if (!formData.code.trim()) {
        formErrors.code = "Course code is required";
        hasError = true;
      }

      if (!formData.name.trim()) {
        formErrors.name = "Course name is required";
        hasError = true;
      }

      formData.sessions.forEach((session: any, i: number) => {
        if (!session.days || session.days.length === 0) {
          formErrors[`session_${i}_days`] = "At least one day must be selected";
          hasError = true;
        }

        if (!session.startTime) {
          formErrors[`session_${i}_startTime`] = "Start time is required";
          hasError = true;
        }

        if (!session.endTime) {
          formErrors[`session_${i}_endTime`] = "End time is required";
          hasError = true;
        }

        if (session.startTime && session.endTime) {
          if (!moment(session.startTime, "HH:mm").isBefore(moment(session.endTime, "HH:mm"))) {
            timeErrors[i] = "Start time must be before end time";
            hasError = true;
          }
        }
      });

      return { timeErrors, formErrors, hasError };
    };
  }, [formData]);

  const handleSubmit = (e: any) => {
    e.preventDefault();

    const { timeErrors, formErrors, hasError } = validateForm();

    setTimeErrors(timeErrors);
    setFormErrors(formErrors);

    if (hasError) return;

    setIsSubmitting(true);

    try {
      if (courseId) {
        if (!activeTimetableId) {
          toast.error('No active timetable found');
          setIsSubmitting(false);
          return;
        }
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
        createCourseForCurrentTimetable(formData as any);
        toast.success(`Successfully added ${formData.code} - ${formData.name}!`);
      }
      
      resetForm();
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add course';
      toast.error(`Failed to ${courseId ? 'update' : 'add'} course: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!courseId || !activeTimetableId) {
      toast.error('Cannot delete course: missing course or timetable information');
      return;
    }

    try {
      const course = courses.find((course: any) => course.id === courseId);
      if (course) {
        deleteCourse(activeTimetableId, course.code as any);
        toast.success(`Successfully deleted ${course.code} - ${course.name}!`);
        resetForm();
        onClose();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete course';
      toast.error(`Failed to delete course: ${errorMessage}`);
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      const course = courses.find((course: any) => course.id === courseId);
      if (course) {
        setFormData({
          code: course.code as any,
          name: course.name,
          sessions: course.sessions.map((session: any) => ({
            ...session,
            days: Array.isArray(session.days) ? session.days : []
          })),
          color: course.color as any,
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
                  {formErrors.code && (
                    <div className="text-red-500 text-xs mt-1">
                      {formErrors.code}
                    </div>
                  )}
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
                {formErrors.name && (
                  <div className="text-red-500 text-xs mt-1">
                    {formErrors.name}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-sm">Sessions</Label>
                <div className="space-y-2 mt-1">
                  {formData.sessions.map((session: any, index: any) => (
                    <div
                      key={index}
                      className="p-4 space-y-2 rounded-md bg-gray-100"
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
                          {formErrors[`session_${index}_days`] && (
                            <div className="text-red-500 text-xs mt-1">
                              {formErrors[`session_${index}_days`]}
                            </div>
                          )}
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
                            {formErrors[`session_${index}_startTime`] && (
                              <div className="text-red-500 text-xs mt-1">
                                {formErrors[`session_${index}_startTime`]}
                              </div>
                            )}
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
                            {formErrors[`session_${index}_endTime`] && (
                              <div className="text-red-500 text-xs mt-1">
                                {formErrors[`session_${index}_endTime`]}
                              </div>
                            )}
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
            <div className="flex justify-between gap-2">
              {courseId && (
                <div className="flex gap-2">
                  {!showDeleteConfirm ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={isSubmitting}
                    >
                      <Trash2 className="w-3 h-3 mr-1.5" />
                      Delete
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={handleDelete}
                        disabled={isSubmitting}
                      >
                        <Trash2 className="w-3 h-3 mr-1.5" />
                        Confirm Delete
                      </Button>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    resetForm();
                    onClose();
                    setShowDeleteConfirm(false);
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  size="sm" 
                  className="h-8 text-xs"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Saving...</span>
                    </div>
                  ) : (
                    courseId ? "Update Course" : "Add Course"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
