/**
 * Route Comparison Testing Script
 * This script tests public routes and compares them with their admin counterparts
 */

const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:5000/api/v1';
const ADMIN_CREDENTIALS = {
  email: 'web@energysolutions.mw',
  password: 'Web@123456'
};

let authToken = '';
const results = {
  timestamp: new Date().toISOString(),
  publicRoutes: [],
  adminRoutes: [],
  inconsistencies: []
};

// Helper function to make requests
async function makeRequest(method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 500,
      data: error.response?.data || { message: error.message }
    };
  }
}

// Login to get auth token
async function login() {
  console.log('🔐 Logging in as Web Admin...');
  const result = await makeRequest('POST', '/auth/login', ADMIN_CREDENTIALS);

  if (result.success && result.data.data?.tokens?.accessToken) {
    authToken = result.data.data.tokens.accessToken;
    console.log('✅ Login successful\n');
    return true;
  } else {
    console.log('❌ Login failed:', result.data.message);
    return false;
  }
}

// Test Services Routes
async function testServices() {
  console.log('📋 Testing Services Routes...\n');

  // Public: Get all services
  console.log('  Testing: GET /public/services');
  const publicServices = await makeRequest('GET', '/public/services');
  results.publicRoutes.push({
    route: 'GET /public/services',
    ...publicServices
  });

  // Admin: Get all services
  console.log('  Testing: GET /admin/web/services');
  const adminServices = await makeRequest('GET', '/admin/web/services', null, {
    Authorization: `Bearer ${authToken}`
  });
  results.adminRoutes.push({
    route: 'GET /admin/web/services',
    ...adminServices
  });

  // Compare
  if (publicServices.success && adminServices.success) {
    const publicCount = publicServices.data.pagination?.total || 0;
    const adminCount = adminServices.data.pagination?.total || 0;

    console.log(`  Public services count: ${publicCount}`);
    console.log(`  Admin services count: ${adminCount}`);

    // Public should only show active services, admin shows all
    if (publicCount > adminCount) {
      results.inconsistencies.push({
        route: 'Services',
        issue: 'Public route shows more services than admin',
        publicCount,
        adminCount
      });
    }
  }

  // Public: Get featured services
  console.log('  Testing: GET /public/services/featured');
  const publicFeatured = await makeRequest('GET', '/public/services/featured');
  results.publicRoutes.push({
    route: 'GET /public/services/featured',
    ...publicFeatured
  });

  if (publicFeatured.success) {
    const count = publicFeatured.data.data?.services?.length || 0;
    console.log(`  Featured services count: ${count}`);

    if (count > 6) {
      results.inconsistencies.push({
        route: 'Services Featured',
        issue: 'Featured services exceed maximum of 6',
        count
      });
    }
  }

  console.log('');
}

// Test Projects Routes
async function testProjects() {
  console.log('📋 Testing Projects Routes...\n');

  // Public: Get all projects
  console.log('  Testing: GET /public/projects');
  const publicProjects = await makeRequest('GET', '/public/projects');
  results.publicRoutes.push({
    route: 'GET /public/projects',
    ...publicProjects
  });

  // Admin: Get all projects
  console.log('  Testing: GET /admin/web/projects');
  const adminProjects = await makeRequest('GET', '/admin/web/projects', null, {
    Authorization: `Bearer ${authToken}`
  });
  results.adminRoutes.push({
    route: 'GET /admin/web/projects',
    ...adminProjects
  });

  // Compare
  if (publicProjects.success && adminProjects.success) {
    const publicCount = publicProjects.data.pagination?.total || 0;
    const adminCount = adminProjects.data.pagination?.total || 0;

    console.log(`  Public projects count: ${publicCount}`);
    console.log(`  Admin projects count: ${adminCount}`);

    // Public should only show published projects
    if (publicCount > adminCount) {
      results.inconsistencies.push({
        route: 'Projects',
        issue: 'Public route shows more projects than admin',
        publicCount,
        adminCount
      });
    }
  }

  // Public: Get featured projects
  console.log('  Testing: GET /public/projects/featured');
  const publicFeatured = await makeRequest('GET', '/public/projects/featured');
  results.publicRoutes.push({
    route: 'GET /public/projects/featured',
    ...publicFeatured
  });

  if (publicFeatured.success) {
    const count = publicFeatured.data.data?.projects?.length || 0;
    console.log(`  Featured projects count: ${count}`);

    if (count > 6) {
      results.inconsistencies.push({
        route: 'Projects Featured',
        issue: 'Featured projects exceed maximum of 6',
        count
      });
    }
  }

  console.log('');
}

// Test Staff Routes
async function testStaff() {
  console.log('📋 Testing Staff Routes...\n');

  // Public: Get all staff
  console.log('  Testing: GET /public/staff');
  const publicStaff = await makeRequest('GET', '/public/staff');
  results.publicRoutes.push({
    route: 'GET /public/staff',
    ...publicStaff
  });

  // Admin: Get all staff
  console.log('  Testing: GET /admin/web/staff');
  const adminStaff = await makeRequest('GET', '/admin/web/staff', null, {
    Authorization: `Bearer ${authToken}`
  });
  results.adminRoutes.push({
    route: 'GET /admin/web/staff',
    ...adminStaff
  });

  // Compare
  if (publicStaff.success && adminStaff.success) {
    const publicCount = publicStaff.data.pagination?.total || 0;
    const adminCount = adminStaff.data.pagination?.total || 0;

    console.log(`  Public staff count: ${publicCount}`);
    console.log(`  Admin staff count: ${adminCount}`);

    // Public should only show active/published staff
    if (publicCount > adminCount) {
      results.inconsistencies.push({
        route: 'Staff',
        issue: 'Public route shows more staff than admin',
        publicCount,
        adminCount
      });
    }
  }

  // Public: Get team leads
  console.log('  Testing: GET /public/staff/team-leads');
  const publicTeamLeads = await makeRequest('GET', '/public/staff/team-leads');
  results.publicRoutes.push({
    route: 'GET /public/staff/team-leads',
    ...publicTeamLeads
  });

  if (publicTeamLeads.success) {
    const count = publicTeamLeads.data.data?.staff?.length || 0;
    console.log(`  Team leads count: ${count}`);
  }

  console.log('');
}

// Test Testimonials Routes
async function testTestimonials() {
  console.log('📋 Testing Testimonials Routes...\n');

  // Public: Get all testimonials
  console.log('  Testing: GET /public/testimonials');
  const publicTestimonials = await makeRequest('GET', '/public/testimonials');
  results.publicRoutes.push({
    route: 'GET /public/testimonials',
    ...publicTestimonials
  });

  // Admin: Get all testimonials
  console.log('  Testing: GET /admin/web/testimonials');
  const adminTestimonials = await makeRequest('GET', '/admin/web/testimonials', null, {
    Authorization: `Bearer ${authToken}`
  });
  results.adminRoutes.push({
    route: 'GET /admin/web/testimonials',
    ...adminTestimonials
  });

  // Compare
  if (publicTestimonials.success && adminTestimonials.success) {
    const publicCount = publicTestimonials.data.pagination?.total || 0;
    const adminCount = adminTestimonials.data.pagination?.total || 0;

    console.log(`  Public testimonials count: ${publicCount}`);
    console.log(`  Admin testimonials count: ${adminCount}`);

    // Public should only show approved testimonials
    if (publicCount > adminCount) {
      results.inconsistencies.push({
        route: 'Testimonials',
        issue: 'Public route shows more testimonials than admin',
        publicCount,
        adminCount
      });
    }
  }

  // Public: Get featured testimonials
  console.log('  Testing: GET /public/testimonials/featured');
  const publicFeatured = await makeRequest('GET', '/public/testimonials/featured');
  results.publicRoutes.push({
    route: 'GET /public/testimonials/featured',
    ...publicFeatured
  });

  if (publicFeatured.success) {
    const count = publicFeatured.data.data?.testimonials?.length || 0;
    console.log(`  Featured testimonials count: ${count}`);

    if (count > 6) {
      results.inconsistencies.push({
        route: 'Testimonials Featured',
        issue: 'Featured testimonials exceed maximum of 6',
        count
      });
    }
  }

  console.log('');
}

// Test Slides Routes
async function testSlides() {
  console.log('📋 Testing Landing Slides Routes...\n');

  // Public: Get all slides
  console.log('  Testing: GET /public/slides');
  const publicSlides = await makeRequest('GET', '/public/slides');
  results.publicRoutes.push({
    route: 'GET /public/slides',
    ...publicSlides
  });

  // Admin: Get all slides
  console.log('  Testing: GET /admin/web/slides');
  const adminSlides = await makeRequest('GET', '/admin/web/slides', null, {
    Authorization: `Bearer ${authToken}`
  });
  results.adminRoutes.push({
    route: 'GET /admin/web/slides',
    ...adminSlides
  });

  // Compare
  if (publicSlides.success && adminSlides.success) {
    const publicCount = publicSlides.data.data?.slides?.length || 0;
    const adminCount = adminSlides.data.data?.slides?.length || 0;

    console.log(`  Public slides count: ${publicCount}`);
    console.log(`  Admin slides count: ${adminCount}`);

    // Public should only show active slides
    if (publicCount > adminCount) {
      results.inconsistencies.push({
        route: 'Slides',
        issue: 'Public route shows more slides than admin',
        publicCount,
        adminCount
      });
    }
  }

  console.log('');
}

// Test Statistics Routes
async function testStatistics() {
  console.log('📋 Testing Statistics Routes...\n');

  // Public: Get statistics
  console.log('  Testing: GET /public/statistics');
  const publicStats = await makeRequest('GET', '/public/statistics');
  results.publicRoutes.push({
    route: 'GET /public/statistics',
    ...publicStats
  });

  if (publicStats.success) {
    const stats = publicStats.data.data;
    console.log('  Statistics:', JSON.stringify(stats, null, 2));

    // Validate structure
    const requiredFields = ['projects', 'services', 'staff', 'testimonials'];
    const missingFields = requiredFields.filter(field => !stats[field]);

    if (missingFields.length > 0) {
      results.inconsistencies.push({
        route: 'Statistics',
        issue: 'Missing required fields',
        missingFields
      });
    }
  }

  console.log('');
}

// Test Contact Form
async function testContactForm() {
  console.log('📋 Testing Contact Form...\n');

  const testContact = {
    name: 'Test User',
    email: 'test@example.com',
    message: 'This is a test message for route comparison'
  };

  console.log('  Testing: POST /public/contact');
  const result = await makeRequest('POST', '/public/contact', testContact);
  results.publicRoutes.push({
    route: 'POST /public/contact',
    ...result
  });

  if (result.success) {
    console.log('  ✅ Contact form submission successful');
  } else {
    console.log('  ❌ Contact form submission failed:', result.data.message);
    results.inconsistencies.push({
      route: 'Contact Form',
      issue: 'Form submission failed',
      error: result.data.message
    });
  }

  console.log('');
}

// Main execution
async function main() {
  console.log('🚀 Starting Route Comparison Tests\n');
  console.log('================================================\n');

  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without authentication');
    process.exit(1);
  }

  // Run all tests
  await testServices();
  await testProjects();
  await testStaff();
  await testTestimonials();
  await testSlides();
  await testStatistics();
  await testContactForm();

  // Summary
  console.log('================================================\n');
  console.log('📊 TEST SUMMARY\n');
  console.log(`Total Public Routes Tested: ${results.publicRoutes.length}`);
  console.log(`Total Admin Routes Tested: ${results.adminRoutes.length}`);
  console.log(`Inconsistencies Found: ${results.inconsistencies.length}\n`);

  if (results.inconsistencies.length > 0) {
    console.log('⚠️  INCONSISTENCIES DETECTED:\n');
    results.inconsistencies.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.route}:`);
      console.log(`   Issue: ${issue.issue}`);
      if (issue.publicCount !== undefined) {
        console.log(`   Public Count: ${issue.publicCount}`);
        console.log(`   Admin Count: ${issue.adminCount}`);
      }
      if (issue.count !== undefined) {
        console.log(`   Count: ${issue.count}`);
      }
      if (issue.missingFields) {
        console.log(`   Missing Fields: ${issue.missingFields.join(', ')}`);
      }
      if (issue.error) {
        console.log(`   Error: ${issue.error}`);
      }
      console.log('');
    });
  } else {
    console.log('✅ No inconsistencies detected!');
  }

  // Save results to file
  fs.writeFileSync(
    'route-comparison-results.json',
    JSON.stringify(results, null, 2)
  );
  console.log('\n📄 Detailed results saved to: route-comparison-results.json');

  console.log('\n🎉 Testing complete!');
}

// Run the tests
main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
