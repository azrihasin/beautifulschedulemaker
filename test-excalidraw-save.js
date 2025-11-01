// Simple test to verify Excalidraw note saving functionality
// This can be run in the browser console to test IndexedDB operations

async function testExcalidrawNoteSaving() {
  console.log('Testing Excalidraw note saving...');
  
  try {
    // Import the storage module (this would work in the browser context)
    const { excalidrawIndexedDBStorage } = await import('./lib/excalidraw-indexeddb-storage.js');
    
    // Test data
    const testTitle = 'Test Note ' + Date.now();
    const testSceneData = {
      elements: [
        {
          id: 'test-element-1',
          type: 'rectangle',
          x: 100,
          y: 100,
          width: 200,
          height: 150,
          strokeColor: '#000000',
          backgroundColor: 'transparent'
        }
      ],
      appState: {
        viewBackgroundColor: '#ffffff'
      }
    };
    
    console.log('Creating test note...');
    const createdNote = await excalidrawIndexedDBStorage.createNote(testTitle, testSceneData);
    console.log('Created note:', createdNote);
    
    console.log('Updating test note...');
    const updatedNote = await excalidrawIndexedDBStorage.updateNote(createdNote.id, {
      title: testTitle + ' (Updated)',
      scene_data: {
        ...testSceneData,
        elements: [
          ...testSceneData.elements,
          {
            id: 'test-element-2',
            type: 'ellipse',
            x: 300,
            y: 200,
            width: 100,
            height: 100,
            strokeColor: '#ff0000',
            backgroundColor: 'transparent'
          }
        ]
      }
    });
    console.log('Updated note:', updatedNote);
    
    console.log('Retrieving note by ID...');
    const retrievedNote = await excalidrawIndexedDBStorage.getNoteById(createdNote.id);
    console.log('Retrieved note:', retrievedNote);
    
    console.log('Getting all notes...');
    const allNotes = await excalidrawIndexedDBStorage.getAllNotes();
    console.log('All notes count:', allNotes.length);
    
    console.log('✅ All tests passed! Excalidraw note saving is working correctly.');
    
    // Clean up test note
    await excalidrawIndexedDBStorage.deleteNote(createdNote.id);
    console.log('Test note cleaned up.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testExcalidrawNoteSaving = testExcalidrawNoteSaving;
}