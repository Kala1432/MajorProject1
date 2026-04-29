// Test script for GitHub push functionality
// Run this in the browser console after generating pipeline files

// Mock data for testing
const mockFiles = {
  dockerfile: "FROM node:18\nWORKDIR /app\nCOPY . .\nRUN npm install\nCMD [\"npm\", \"start\"]",
  dockerCompose: "version: '3.8'\nservices:\n  app:\n    build: .\n    ports:\n      - '3000:3000'",
  githubAction: "name: CI\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v2\n      - run: npm install\n      - run: npm test",
  jenkinsfile: "pipeline {\n  agent any\n  stages {\n    stage('Build') {\n      steps {\n        sh 'npm install'\n      }\n    }\n  }\n}",
  summary: "Test pipeline summary"
};

const mockCtx = {
  owner: "testuser",
  repo: "testrepo",
  defaultBranch: "main",
  language: "JavaScript",
  detectedFramework: "React",
  detectedRuntime: "Node.js"
};

// Test base64 encoding
function testBase64Encoding() {
  const encodeBase64 = (str) => btoa(unescape(encodeURIComponent(str)));

  console.log("Testing base64 encoding...");
  const testStr = "FROM node:18\nconsole.log('🚀 Hello 🌍');";
  const encoded = encodeBase64(testStr);
  const decoded = decodeURIComponent(escape(atob(encoded)));

  console.log("Original:", testStr);
  console.log("Encoded:", encoded);
  console.log("Decoded:", decoded);
  console.log("Encoding test:", decoded === testStr ? "✅ PASS" : "❌ FAIL");
}

// Test URL parsing
function testUrlParsing() {
  const parseGithubRepo = (rawUrl) => {
    const match = rawUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:$|[/?#])/i);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  };

  console.log("Testing URL parsing...");
  const urls = [
    "https://github.com/vercel/next.js",
    "https://github.com/expressjs/express.git",
    "github.com/Kala1432/Testing26"
  ];

  urls.forEach(url => {
    const result = parseGithubRepo(url);
    console.log(`${url} ->`, result);
  });
}

// Test the new GitHub push functions (if available)
async function testGitHubFunctions() {
  if (typeof window !== 'undefined' && window.pushFileToGitHub) {
    console.log("Testing GitHub push functions...");

    // This would require a real token and repo to test fully
    console.log("GitHub functions available:", {
      pushFileToGitHub: typeof window.pushFileToGitHub,
      pushFilesToGitHub: typeof window.pushFilesToGitHub
    });
  } else {
    console.log("GitHub functions not available in this context");
  }
}

// Run tests
testBase64Encoding();
testUrlParsing();
testGitHubFunctions();

console.log("\n🎯 How the new GitHub push logic works:");
console.log("1. Check if file exists using GET /contents/:path?ref=branch");
console.log("2. If exists (200): extract SHA and include in PUT request");
console.log("3. If not exists (404): PUT without SHA to create new file");
console.log("4. Handle errors: 401=invalid token, 403=permissions, 404=repo/branch not found");
console.log("5. Use proper headers: Authorization: Bearer <token>, Accept: application/vnd.github+json");
console.log("6. Base64 encode content using btoa(unescape(encodeURIComponent(str)))");

console.log("\n🚀 To test in the app:");
console.log("1. Open http://127.0.0.1:5174 (server started on port 5174)");
console.log("2. Enter a GitHub repo URL");
console.log("3. Click GENERATE");
console.log("4. Enter GitHub token");
console.log("5. Click push button");
console.log("6. Check console for detailed logs");