/**
 * Test script for rate limiting functionality
 * Run with: node scripts/test-rate-limiting.js
 */

const BASE_URL = 'http://localhost:3000';

async function testRateLimit() {
  console.log('🧪 Testing Rate Limiting System\n');
  
  try {
    // Test 1: Normal request (should work)
    console.log('📝 Test 1: Normal chat request');
    const response1 = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'your-auth-cookie-here' // Replace with actual auth
      },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: 'Hello, this is a test message.'
        }],
        timetable_id: 'test-timetable'
      })
    });
    
    console.log(`Status: ${response1.status}`);
    console.log('Headers:');
    console.log(`  X-RateLimit-Tokens-Used: ${response1.headers.get('X-RateLimit-Tokens-Used')}`);
    console.log(`  X-RateLimit-Tokens-Remaining: ${response1.headers.get('X-RateLimit-Tokens-Remaining')}`);
    console.log(`  X-RateLimit-Requests-Used: ${response1.headers.get('X-RateLimit-Requests-Used')}`);
    console.log(`  X-RateLimit-Requests-Remaining: ${response1.headers.get('X-RateLimit-Requests-Remaining')}`);
    console.log(`  X-RateLimit-Reset: ${response1.headers.get('X-RateLimit-Reset')}`);
    
    if (response1.status === 200) {
      console.log('✅ Normal request successful\n');
    } else {
      const errorData = await response1.json();
      console.log('❌ Normal request failed:', errorData);
    }
    
    // Test 2: Check current usage
    console.log('📊 Test 2: Check current token usage');
    const usageResponse = await fetch(`${BASE_URL}/api/chat/usage`, {
      method: 'GET',
      headers: {
        'Cookie': 'your-auth-cookie-here' // Replace with actual auth
      }
    });
    
    if (usageResponse.status === 200) {
      const usageData = await usageResponse.json();
      console.log('Current usage:', usageData);
      console.log('✅ Usage check successful\n');
    } else {
      console.log('❌ Usage check failed\n');
    }
    
    // Test 3: Rapid requests to trigger rate limit
    console.log('🚀 Test 3: Rapid requests to test rate limiting');
    const promises = [];
    
    for (let i = 0; i < 5; i++) {
      promises.push(
        fetch(`${BASE_URL}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': 'your-auth-cookie-here' // Replace with actual auth
          },
          body: JSON.stringify({
            messages: [{
              role: 'user',
              content: `Rapid test message ${i + 1}`
            }],
            timetable_id: 'test-timetable'
          })
        })
      );
    }
    
    const responses = await Promise.all(promises);
    
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      console.log(`Request ${i + 1}: Status ${response.status}`);
      
      if (response.status === 429) {
        const errorData = await response.json();
        console.log('  Rate limit error:', errorData);
        console.log('  ✅ Rate limiting working correctly!');
      } else if (response.status === 200) {
        console.log('  ✅ Request successful');
      } else {
        console.log('  ❌ Unexpected status');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test course-agent endpoint as well
async function testCourseAgentRateLimit() {
  console.log('\n🎓 Testing Course Agent Rate Limiting\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/chat/course-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'your-auth-cookie-here' // Replace with actual auth
      },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: 'Add a test course to my timetable'
        }],
        timetable_id: 'test-timetable'
      })
    });
    
    console.log(`Status: ${response.status}`);
    console.log('Headers:');
    console.log(`  X-RateLimit-Tokens-Used: ${response.headers.get('X-RateLimit-Tokens-Used')}`);
    console.log(`  X-RateLimit-Tokens-Remaining: ${response.headers.get('X-RateLimit-Tokens-Remaining')}`);
    
    if (response.status === 200) {
      console.log('✅ Course agent request successful');
    } else if (response.status === 429) {
      const errorData = await response.json();
      console.log('✅ Course agent rate limiting working:', errorData);
    } else {
      console.log('❌ Unexpected response from course agent');
    }
    
  } catch (error) {
    console.error('❌ Course agent test failed:', error);
  }
}

// Run tests
if (require.main === module) {
  console.log('🚀 Starting Rate Limiting Tests...');
  console.log('⚠️  Make sure your development server is running on localhost:3000');
  console.log('⚠️  Update the auth cookie in this script for authenticated requests\n');
  
  testRateLimit()
    .then(() => testCourseAgentRateLimit())
    .then(() => {
      console.log('\n🎉 All tests completed!');
    })
    .catch(error => {
      console.error('\n💥 Test suite failed:', error);
    });
}

module.exports = { testRateLimit, testCourseAgentRateLimit };