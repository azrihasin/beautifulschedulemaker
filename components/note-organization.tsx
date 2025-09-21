'use client';

import React from 'react';
import { Pin, PinOff, FileText, BookOpen, Calendar } from 'lucide-react';
import { useNoteStore } from '@/stores/noteStore';
import { useCourseStore } from '@/stores/courseStore';
import { useTimetableStore } from '@/stores/timetableStore';
import type { Note, NoteContext } from '@/stores/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NoteOrganizationProps {
  timetableId: string;
  onSelectNote: (context: NoteContext) => void;
  selectedContext: NoteContext | null;
}

interface NoteItemProps {
  note: Note;
  onSelect: () => void;
  onTogglePin: () => void;
  isSelected: boolean;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
}

const NoteItem: React.FC<NoteItemProps> = ({
  note,
  onSelect,
  onTogglePin,
  isSelected,
  title,
  subtitle,
  icon
}) => {
  const getContentPreview = (note: Note): string => {
    if (!note.content?.content) return 'Empty note';
    
    const extractText = (node: any): string => {
      if (node.text) return node.text;
      if (node.content) {
        return node.content.map(extractText).join('');
      }
      return '';
    };

    const text = note.content.content.map(extractText).join(' ').trim();
    return text.length > 50 ? text.substring(0, 50) + '...' : text || 'Empty note';
  };

  return (
    <div
      className={cn(
        "group flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
        isSelected 
          ? "bg-blue-50 border-blue-200" 
          : "bg-white border-gray-200 hover:bg-gray-50"
      )}
      onClick={onSelect}
    >
      <div className="flex-shrink-0 mt-0.5">
        {icon}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {title}
          </h4>
          {note.isPinned && (
            <Pin className="h-3 w-3 text-blue-600 flex-shrink-0" />
          )}
        </div>
        
        {subtitle && (
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {subtitle}
          </p>
        )}
        
        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
          {getContentPreview(note)}
        </p>
        
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">
            {new Date(note.updatedAt).toLocaleDateString()}
          </span>
          
          {note.tags.length > 0 && (
            <div className="flex gap-1">
              {note.tags.slice(0, 2).map((tag, index) => (
                <span
                  key={index}
                  className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                >
                  {tag}
                </span>
              ))}
              {note.tags.length > 2 && (
                <span className="text-xs text-gray-400">
                  +{note.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin();
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
      >
        {note.isPinned ? (
          <PinOff className="h-3 w-3" />
        ) : (
          <Pin className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
};

export const NoteOrganization: React.FC<NoteOrganizationProps> = ({
  timetableId,
  onSelectNote,
  selectedContext
}) => {
  const { getOrganizedNotes, getPinnedNotes, togglePin } = useNoteStore();
  const { courses } = useCourseStore();
  const { timetables } = useTimetableStore();

  const organizedNotes = getOrganizedNotes(timetableId);
  const pinnedNotes = getPinnedNotes(timetableId);
  
  const timetable = timetables.find(t => t.id === timetableId);

  const handleTogglePin = async (noteId: string) => {
    try {
      await togglePin(noteId);
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const isContextSelected = (context: NoteContext): boolean => {
    if (!selectedContext) return false;
    
    return (
      selectedContext.type === context.type &&
      selectedContext.timetableId === context.timetableId &&
      selectedContext.courseId === context.courseId &&
      selectedContext.sessionId === context.sessionId
    );
  };

  const getCourseTitle = (courseId: string): string => {
    const course = courses.find(c => c.id === courseId);
    return course ? `${course.code} - ${course.name}` : 'Unknown Course';
  };

  const getSessionTitle = (courseId: string, sessionId: string): string => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return 'Unknown Session';
    
    const session = course.sessions.find(s => s.session_id === sessionId);
    if (!session) return 'Unknown Session';
    
    const daysStr = session.days.join(', ');
    const timeStr = `${session.startTime}-${session.endTime}`;
    return `${course.code} - ${daysStr} ${timeStr}`;
  };

  return (
    <div className="space-y-6">
      {/* Pinned Notes Section */}
      {pinnedNotes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Pin className="h-4 w-4 text-blue-600" />
            Pinned Notes
          </h3>
          <div className="space-y-2">
            {pinnedNotes.map((note) => {
              let context: NoteContext;
              let title: string;
              let subtitle: string | undefined;
              let icon: React.ReactNode;

              if (note.sessionId && note.courseId) {
                context = {
                  type: 'session',
                  timetableId,
                  courseId: note.courseId,
                  sessionId: note.sessionId
                };
                title = getSessionTitle(note.courseId, note.sessionId);
                subtitle = 'Session notes';
                icon = <Calendar className="h-4 w-4 text-green-600" />;
              } else if (note.courseId) {
                context = {
                  type: 'course',
                  timetableId,
                  courseId: note.courseId
                };
                title = getCourseTitle(note.courseId);
                subtitle = 'Course notes';
                icon = <BookOpen className="h-4 w-4 text-orange-600" />;
              } else {
                context = {
                  type: 'timetable',
                  timetableId
                };
                title = `${timetable?.name || 'Timetable'} Notes`;
                subtitle = 'General notes';
                icon = <FileText className="h-4 w-4 text-blue-600" />;
              }

              return (
                <NoteItem
                  key={note.id}
                  note={note}
                  onSelect={() => onSelectNote(context)}
                  onTogglePin={() => handleTogglePin(note.id)}
                  isSelected={isContextSelected(context)}
                  title={title}
                  subtitle={subtitle}
                  icon={icon}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Timetable Notes */}
      {organizedNotes.timetable.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            Timetable Notes
          </h3>
          <div className="space-y-2">
            {organizedNotes.timetable.map((note) => {
              const context: NoteContext = {
                type: 'timetable',
                timetableId
              };

              return (
                <NoteItem
                  key={note.id}
                  note={note}
                  onSelect={() => onSelectNote(context)}
                  onTogglePin={() => handleTogglePin(note.id)}
                  isSelected={isContextSelected(context)}
                  title={`${timetable?.name || 'Timetable'} Notes`}
                  subtitle="General notes"
                  icon={<FileText className="h-4 w-4 text-blue-600" />}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Course Notes */}
      {organizedNotes.course.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-orange-600" />
            Course Notes
          </h3>
          <div className="space-y-2">
            {organizedNotes.course.map((note) => {
              if (!note.courseId) return null;
              
              const context: NoteContext = {
                type: 'course',
                timetableId,
                courseId: note.courseId
              };

              return (
                <NoteItem
                  key={note.id}
                  note={note}
                  onSelect={() => onSelectNote(context)}
                  onTogglePin={() => handleTogglePin(note.id)}
                  isSelected={isContextSelected(context)}
                  title={getCourseTitle(note.courseId)}
                  subtitle="Course notes"
                  icon={<BookOpen className="h-4 w-4 text-orange-600" />}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Session Notes */}
      {organizedNotes.session.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-green-600" />
            Session Notes
          </h3>
          <div className="space-y-2">
            {organizedNotes.session.map((note) => {
              if (!note.courseId || !note.sessionId) return null;
              
              const context: NoteContext = {
                type: 'session',
                timetableId,
                courseId: note.courseId,
                sessionId: note.sessionId
              };

              return (
                <NoteItem
                  key={note.id}
                  note={note}
                  onSelect={() => onSelectNote(context)}
                  onTogglePin={() => handleTogglePin(note.id)}
                  isSelected={isContextSelected(context)}
                  title={getSessionTitle(note.courseId, note.sessionId)}
                  subtitle="Session notes"
                  icon={<Calendar className="h-4 w-4 text-green-600" />}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {pinnedNotes.length === 0 && 
       organizedNotes.timetable.length === 0 && 
       organizedNotes.course.length === 0 && 
       organizedNotes.session.length === 0 && (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-sm font-medium text-gray-900 mb-2">No notes yet</h3>
          <p className="text-sm text-gray-500">
            Start taking notes by selecting a timetable element or creating a new note.
          </p>
        </div>
      )}
    </div>
  );
};