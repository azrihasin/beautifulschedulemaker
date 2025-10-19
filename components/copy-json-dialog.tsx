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
import moment from "moment";
import { Textarea } from "./ui/textarea";

const DAYS_OF_WEEK = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export default function CopyJsonDialog({ isOpen, onClose, courseId }: any) {
  const { getCourses, addCourse, updateCourse } = useCourseStore();
  const { activeTimetableId } = useTimetableStore();
  const courses = getCourses(activeTimetableId || '');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] h-full flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base font-semibold">
            {courseId ? "Edit Course" : "Add Course"}
          </DialogTitle>
        </DialogHeader>

        <Textarea
          value={JSON.stringify(courses, null, 2)}
          readOnly
          className="min-h-[150px] font-mono text-sm resize-none bg-white"
        />
      </DialogContent>
    </Dialog>
  );
}
