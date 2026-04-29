import { describe, it, expect } from "vitest";

// Test the base64 encoding function used in GitHub push
const encodeBase64 = (str: string) => {
  return btoa(unescape(encodeURIComponent(str)));
};

describe("GitHub Push Functionality", () => {
  it("should encode content to base64 correctly", () => {
    const testContent = "FROM node:18\nWORKDIR /app\nCOPY . .\nRUN npm install\nCMD [\"npm\", \"start\"]";
    const encoded = encodeBase64(testContent);
    expect(encoded).toBeDefined();
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(0);

    // Verify it can be decoded back
    const decoded = decodeURIComponent(escape(atob(encoded)));
    expect(decoded).toBe(testContent);
  });

  it("should handle UTF-8 characters correctly", () => {
    const testContent = "console.log('🚀 Hello World 🌍');";
    const encoded = encodeBase64(testContent);
    const decoded = decodeURIComponent(escape(atob(encoded)));
    expect(decoded).toBe(testContent);
  });

  it("should parse GitHub repo URL correctly", () => {
    const parseGithubRepo = (rawUrl: string) => {
      const match = rawUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:$|[/?#])/i);
      if (!match) return null;
      return { owner: match[1], repo: match[2] };
    };

    expect(parseGithubRepo("https://github.com/vercel/next.js")).toEqual({ owner: "vercel", repo: "next.js" });
    expect(parseGithubRepo("https://github.com/expressjs/express.git")).toEqual({ owner: "expressjs", repo: "express" });
    expect(parseGithubRepo("github.com/Kala1432/Testing26")).toEqual({ owner: "Kala1432", repo: "Testing26" });
    expect(parseGithubRepo("invalid-url")).toBeNull();
  });
});

describe("example", () => {
  it("should pass", () => {
    expect(true).toBe(true);
  });
});
