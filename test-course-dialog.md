# Course Dialog Fixes Test Plan

## Issues Fixed

### 1. Default Color Issue
- **Problem**: When adding a new course, the default color was not applied (was empty string)
- **Solution**: Set default color to "#3b82f6" in initial state and resetForm function
- **Test**: Open "Add Course" dialog and verify the color picker shows blue (#3b82f6) by default

### 2. Form Validation Issues
- **Problem**: No validation for required fields (name, code, days, start/end time)
- **Solution**: Added comprehensive validation with error messages
- **Tests**:

#### Required Field Validation
1. **Course Code**: Try to submit without entering course code → Should show "Course code is required"
2. **Course Name**: Try to submit without entering course name → Should show "Course name is required"
3. **Days Selection**: Try to submit without selecting any days → Should show "At least one day must be selected"
4. **Start Time**: Try to submit without start time → Should show "Start time is required"
5. **End Time**: Try to submit without end time → Should show "End time is required"

#### Time Validation
6. **Invalid Time Range**: Set start time after end time → Should show "Start time must be before end time"

#### Error Clearing
7. **Dynamic Error Clearing**: Start typing in a field with an error → Error should disappear
8. **Session Error Clearing**: Change session fields with errors → Specific session errors should clear

## Implementation Details

### Changes Made:
1. Updated initial state: `color: "#3b82f6"` instead of `color: ""`
2. Updated resetForm function to set default color and clear errors
3. Added formErrors state for validation messages
4. Enhanced handleSubmit with comprehensive validation
5. Added error clearing in handleInputChange and handleSessionChange
6. Added error display elements in the UI for all validated fields

### Files Modified:
- `components/course-dialog.tsx` - Main implementation

### Validation Rules:
- Course code: Required, non-empty string
- Course name: Required, non-empty string  
- Session days: At least one day must be selected
- Start time: Required
- End time: Required
- Time logic: Start time must be before end time

The fixes ensure a better user experience with proper validation feedback and consistent default color application.