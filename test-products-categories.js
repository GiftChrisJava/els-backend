/**
 * Test script for new public Products and Categories routes
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1/public';

const results = {
  timestamp: new Date().toISOString(),
  routes: [],
  summary: {
    total: 0,
    success: 0,
    failed: 0
  }
};

async function testRoute(method, path, description, data = null) {
  console.log(`\n🧪 Testing: ${method} ${path}`);
  console.log(`   ${description}`);

  try {
    const config = {
      method,
      url: `${BASE_URL}${path}`,
      headers: { 'Content-Type': 'application/json' }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);

    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   📊 Data keys: ${Object.keys(response.data).join(', ')}`);

    results.routes.push({
      method,
      path,
      description,
      success: true,
      status: response.status,
      data: response.data
    });

    results.summary.success++;
    return response.data;
  } catch (error) {
    console.log(`   ❌ Error: ${error.response?.status || 500} - ${error.response?.data?.message || error.message}`);

    results.routes.push({
      method,
      path,
      description,
      success: false,
      status: error.response?.status || 500,
      error: error.response?.data || { message: error.message }
    });

    results.summary.failed++;
    return null;
  }
}

async function main() {
  console.log('================================================');
  console.log('🚀 TESTING NEW PUBLIC ROUTES - PRODUCTS & CATEGORIES');
  console.log('================================================');

  // ============ CATEGORIES ROUTES ============
  console.log('\n\n📂 TESTING CATEGORIES ROUTES\n');
  console.log('────────────────────────────────────────────────');

  await testRoute(
    'GET',
    '/categories',
    'Get all active categories with pagination'
  );

  await testRoute(
    'GET',
    '/categories?featured=true',
    'Get featured categories only'
  );

  await testRoute(
    'GET',
    '/categories/tree',
    'Get category hierarchy tree'
  );

  await testRoute(
    'GET',
    '/categories/electronics',
    'Get category by slug (example: electronics)'
  );

  await testRoute(
    'GET',
    '/categories/non-existent-category',
    'Test 404 error handling for categories'
  );

  // ============ PRODUCTS ROUTES ============
  console.log('\n\n📦 TESTING PRODUCTS ROUTES\n');
  console.log('────────────────────────────────────────────────');

  await testRoute(
    'GET',
    '/products',
    'Get all active and published products'
  );

  await testRoute(
    'GET',
    '/products?page=1&limit=6',
    'Test pagination (page 1, limit 6)'
  );

  await testRoute(
    'GET',
    '/products?category=electronics',
    'Filter products by category slug'
  );

  await testRoute(
    'GET',
    '/products?minPrice=1000&maxPrice=50000',
    'Filter products by price range'
  );

  await testRoute(
    'GET',
    '/products?inStock=true',
    'Filter products that are in stock'
  );

  await testRoute(
    'GET',
    '/products?search=solar',
    'Search products by keyword'
  );

  await testRoute(
    'GET',
    '/products?sort=pricing.price&order=asc',
    'Sort products by price (ascending)'
  );

  await testRoute(
    'GET',
    '/products/featured',
    'Get featured products (max 8)'
  );

  await testRoute(
    'GET',
    '/products/solar-panel-200w',
    'Get product by slug (example)'
  );

  await testRoute(
    'GET',
    '/products/non-existent-product',
    'Test 404 error handling for products'
  );

  // ============ SUMMARY ============
  console.log('\n\n================================================');
  console.log('📊 TEST SUMMARY');
  console.log('================================================\n');

  results.summary.total = results.routes.length;

  console.log(`Total Routes Tested: ${results.summary.total}`);
  console.log(`✅ Successful: ${results.summary.success}`);
  console.log(`❌ Failed: ${results.summary.failed}`);
  console.log(`Success Rate: ${((results.summary.success / results.summary.total) * 100).toFixed(1)}%`);

  // Show failed routes
  if (results.summary.failed > 0) {
    console.log('\n⚠️  FAILED ROUTES:\n');
    results.routes
      .filter(r => !r.success)
      .forEach((route, index) => {
        console.log(`${index + 1}. ${route.method} ${route.path}`);
        console.log(`   Status: ${route.status}`);
        console.log(`   Error: ${route.error.message || 'Unknown error'}`);
        console.log('');
      });
  }

  // Show successful routes with data counts
  console.log('\n✅ SUCCESSFUL ROUTES:\n');
  results.routes
    .filter(r => r.success)
    .forEach((route, index) => {
      console.log(`${index + 1}. ${route.method} ${route.path}`);
      if (route.data.data) {
        if (Array.isArray(route.data.data)) {
          console.log(`   Records: ${route.data.data.length}`);
        } else if (route.data.data.categories) {
          console.log(`   Categories: ${route.data.data.categories.length}`);
        } else if (route.data.data.products) {
          console.log(`   Products: ${route.data.data.products.length}`);
        }
        if (route.data.pagination) {
          console.log(`   Total: ${route.data.pagination.total}`);
        }
      }
      console.log('');
    });

  // Save results to file
  const fs = require('fs');
  fs.writeFileSync(
    'products-categories-test-results.json',
    JSON.stringify(results, null, 2)
  );

  console.log('📄 Detailed results saved to: products-categories-test-results.json\n');

  console.log('🎉 Testing complete!\n');
}

main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
