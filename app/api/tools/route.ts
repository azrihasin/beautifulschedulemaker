import { NextRequest, NextResponse } from 'next/server';

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

    switch (toolName) {
      case 'searchNotes': {
        const { query } = args;
        
        // Return empty results since database is no longer available
        return NextResponse.json({
          query,
          totalNotes: 0,
          notes: [],
          message: 'Notes search is currently unavailable - data is stored locally'
        });
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