import { useTimetableStore } from '../stores/timetableStore';

async function testTimetablePersistence() {
  console.log('Testing timetable persistence...');
  
  const store = useTimetableStore.getState();
  
  console.log('Initial state:');
  console.log('- Timetables:', store.timetables.length);
  console.log('- Active timetable ID:', store.activeTimetableId);
  
  const newTimetable = store.addTimetable();
  console.log('\nAfter adding timetable:');
  console.log('- Timetables:', store.getTimetables().length);
  console.log('- Active timetable ID:', store.activeTimetableId);
  console.log('- New timetable:', newTimetable);
  
  store.setActiveTimetable(newTimetable.id);
  console.log('\nAfter setting active timetable:');
  console.log('- Active timetable ID:', store.activeTimetableId);
  
  const anotherTimetable = store.addTimetable();
  console.log('\nAfter adding another timetable:');
  console.log('- Timetables:', store.getTimetables().length);
  console.log('- Active timetable ID:', store.activeTimetableId);
  
  store.setActiveTimetable(newTimetable.id);
  console.log('\nAfter switching back to first timetable:');
  console.log('- Active timetable ID:', store.activeTimetableId);
  
  console.log('\nPersistence test completed. Data should be saved to IndexedDB.');
  console.log('Refresh the page to test restoration.');
}

if (typeof window !== 'undefined') {
  testTimetablePersistence().catch(console.error);
}

export { testTimetablePersistence };