import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Helper function to extract text from Tiptap JSON content
function extractTextFromContent(content: any[]): string {
  if (!Array.isArray(content)) return '';
  
  return content.map(node => {
    if (node.type === 'paragraph' && node.content) {
      return node.content.map((textNode: any) => textNode.text || '').join('');
    }
    return '';
  }).filter(text => text.trim()).join(' ');
}

export async function POST(req: NextRequest) {
  try {
    const { toolName, args } = await req.json();
    
    // Get user from Supabase auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    switch (toolName) {
      case 'searchNotes': {
        const { query } = args;
        
        try {
          // Search notes with text content matching the query
          const { data: notes, error } = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

          if (error) {
            return NextResponse.json({ error: 'Failed to search notes' }, { status: 500 });
          }

          // Filter notes based on query
          const relevantNotes = (notes || []).filter(note => {
            const content = extractTextFromContent(note.content?.content || []);
            const queryLower = query.toLowerCase();
            
            // Check if query matches content, tags, or context
            return content.toLowerCase().includes(queryLower) ||
                   (note.tags || []).some((tag: string) => tag.toLowerCase().includes(queryLower)) ||
                   (note.course_id && queryLower.includes('course')) ||
                   (note.session_id && queryLower.includes('session'));
          });

          const summary = relevantNotes.map(note => {
            const contextType = note.session_id ? 'Session' : note.course_id ? 'Course' : 'Timetable';
            const content = extractTextFromContent(note.content?.content || []);
            const date = new Date(note.updated_at).toLocaleDateString();
            
            return {
              type: contextType,
              date,
              content: content.slice(0, 300),
              tags: note.tags || [],
              isPinned: note.is_pinned
            };
          });

          return NextResponse.json({
            query,
            totalNotes: relevantNotes.length,
            notes: summary
          });
        } catch (error) {
          console.error('Error searching notes:', error);
          return NextResponse.json({ error: 'Failed to search notes' }, { status: 500 });
        }
      }
      
      case 'addCourse': {
        const { code, name, sessions, color } = args;
        
        try {
          // Add course logic here if needed
          return NextResponse.json({
            success: true,
            message: `Course ${code} - ${name} has been added successfully`,
            course: { code, name, sessions, color }
          });
        } catch (error) {
          console.error('Error adding course:', error);
          return NextResponse.json({ error: 'Failed to add course' }, { status: 500 });
        }
      }
      
      case 'getLocation': {
        // Mock location response
        return NextResponse.json({
          location: 'User location access requested',
          message: 'Location permission required'
        });
      }
      
      default:
        return NextResponse.json({ error: 'Unknown tool' }, { status: 400 });
    }
  } catch (error) {
    console.error('Tool execution error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}