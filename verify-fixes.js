/**
 * Quick verification script to check if the fixes are working
 */

const axios = require('axios');

const BASE_URL = (process.env.API_BASE_URL || 'https://esl-api.onrender.com/api/v1').replace(/\/+$/, '');

async function checkFeaturedProjects() {
  console.log('🔍 Checking Featured Projects Endpoint...\n');

  try {
    const response = await axios.get(`${BASE_URL}/public/projects/featured`);
    const projects = response.data.data.projects;

    console.log(`✅ Response Status: ${response.status}`);
    console.log(`📊 Total Featured Projects: ${projects.length}\n`);

    let hasUnpublished = false;

    projects.forEach((project, index) => {
      console.log(`Project ${index + 1}:`);
      console.log(`  - Title: ${project.title}`);
      console.log(`  - ID: ${project._id}`);
      console.log(`  - Status: ${project.status}`);
      console.log(`  - isPublished: ${project.isPublished}`);

      if (project.isPublished === false) {
        console.log(`  ⚠️  WARNING: Unpublished project found!`);
        hasUnpublished = true;
      }
      console.log('');
    });

    if (hasUnpublished) {
      console.log('❌ FIX NOT WORKING: Unpublished projects are still visible\n');
      return false;
    } else {
      console.log('✅ FIX VERIFIED: Only published projects are visible\n');
      return true;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function checkFeaturedTestimonials() {
  console.log('🔍 Checking Featured Testimonials Endpoint...\n');

  try {
    const response = await axios.get(`${BASE_URL}/public/testimonials/featured`);
    const testimonials = response.data.data.testimonials;

    console.log(`✅ Response Status: ${response.status}`);
    console.log(`📊 Total Featured Testimonials: ${testimonials.length}\n`);

    let hasRejectionReason = false;

    testimonials.forEach((testimonial, index) => {
      console.log(`Testimonial ${index + 1}:`);
      console.log(`  - Author: ${testimonial.author.name}`);
      console.log(`  - Rating: ${testimonial.rating}`);
      console.log(`  - Status: ${testimonial.status}`);

      if (testimonial.rejectionReason !== undefined) {
        console.log(`  ⚠️  WARNING: rejectionReason field found: "${testimonial.rejectionReason}"`);
        hasRejectionReason = true;
      } else {
        console.log(`  ✅ rejectionReason field properly excluded`);
      }
      console.log('');
    });

    if (hasRejectionReason) {
      console.log('❌ FIX NOT WORKING: rejectionReason is still exposed\n');
      return false;
    } else {
      console.log('✅ FIX VERIFIED: rejectionReason field is properly excluded\n');
      return true;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function main() {
  console.log('================================================');
  console.log('🧪 VERIFYING PUBLIC ROUTE FIXES');
  console.log('================================================\n');

  const fix1 = await checkFeaturedProjects();
  console.log('================================================\n');

  const fix2 = await checkFeaturedTestimonials();
  console.log('================================================\n');

  console.log('📋 FINAL RESULTS:');
  console.log(`  Fix #1 (Projects isPublished): ${fix1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Fix #2 (Testimonials rejectionReason): ${fix2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');

  if (fix1 && fix2) {
    console.log('🎉 All fixes verified successfully!');
    process.exit(0);
  } else {
    console.log('⚠️  Some fixes need attention. Server may need to be restarted.');
    process.exit(1);
  }
}

main();
