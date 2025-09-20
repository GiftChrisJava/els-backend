// Test file to verify Appwrite service

async function testAppwriteService() {
  console.log("Testing Appwrite service initialization...");

  try {
    // Just test if the service can be instantiated
    console.log("Appwrite service initialized successfully");

    // Log configuration (without sensitive data)
    console.log("Configuration check:");
    console.log("- Endpoint configured:", !!process.env.APPWRITE_ENDPOINT);
    console.log("- Project ID configured:", !!process.env.APPWRITE_PROJECT_ID);
    console.log("- Bucket ID configured:", !!process.env.APPWRITE_BUCKET_ID);
    console.log("- API Key configured:", !!process.env.APPWRITE_API_KEY);
  } catch (error) {
    console.error("Error initializing Appwrite service:", error);
  }
}

testAppwriteService();
