/**
 * Push a single file to GitHub repository using GitHub REST API
 * Handles both creating new files and updating existing ones
 */
export async function pushFileToGitHub(
  owner: string,
  repo: string,
  path: string,
  content: string,
  token: string,
  branch: string = "main"
): Promise<{ success: boolean; sha?: string; error?: string }> {
  const baseUrl = `https://api.github.com/repos/${owner}/${repo}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };

  // Helper function for proper base64 encoding
  const encodeBase64 = (str: string): string => {
    return btoa(unescape(encodeURIComponent(str)));
  };

  try {
    // First, check if the file exists
    const checkUrl = `${baseUrl}/contents/${encodeURIComponent(path)}?ref=${branch}`;
    console.log(`📁 Checking if ${path} exists...`);

    const existingRes = await fetch(checkUrl, {
      method: "GET",
      headers,
    });

    let sha: string | undefined;

    if (existingRes.ok) {
      // File exists, get its SHA for updating
      const existingData = await existingRes.json();
      sha = existingData.sha;
      console.log(`   ✏️  File exists, will update (sha: ${sha.substring(0, 7)})`);
    } else if (existingRes.status === 404) {
      // File doesn't exist, will create new
      console.log(`   ➕ File doesn't exist, will create new`);
    } else {
      // Other error (401, 403, etc.)
      const errorData = await existingRes.json();
      return {
        success: false,
        error: `Failed to check file ${path}: ${errorData.message || existingRes.statusText}`,
      };
    }

    // Prepare the request body
    const body: Record<string, unknown> = {
      message: `🚀 Auto-generated CI/CD pipeline from Pipeline.sh`,
      content: encodeBase64(content),
      branch: branch,
      committer: {
        name: "Pipeline.sh",
        email: "bot@pipeline.sh",
      },
    };

    // Include SHA if updating existing file
    if (sha) {
      body.sha = sha;
    }

    // Push the file
    const pushUrl = `${baseUrl}/contents/${encodeURIComponent(path)}`;
    console.log(`   📤 Pushing to ${pushUrl}`);

    const pushRes = await fetch(pushUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });

    if (!pushRes.ok) {
      let errorMessage = `Failed to ${sha ? 'update' : 'create'} ${path}`;

      try {
        const errorData = await pushRes.json();
        console.error(`❌ GitHub API error:`, errorData);

        // Handle specific error codes
        if (pushRes.status === 401) {
          errorMessage = "Invalid token or token has expired";
        } else if (pushRes.status === 403) {
          errorMessage = "Token doesn't have permission to write to this repository";
        } else if (pushRes.status === 404) {
          errorMessage = "Repository not found or branch doesn't exist";
        } else {
          errorMessage = errorData.message || pushRes.statusText;
        }
      } catch {
        const text = await pushRes.text();
        console.error(`❌ GitHub API error text:`, text);
        if (text) errorMessage = text;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    const pushData = await pushRes.json();
    console.log(`   ✅ File ${sha ? 'updated' : 'created'}: ${path}, commit ${pushData.commit?.sha?.substring(0, 7) || 'unknown'}`);

    return {
      success: true,
      sha: pushData.content?.sha,
    };

  } catch (err: any) {
    console.error(`🔴 Error pushing ${path}:`, err);
    return {
      success: false,
      error: err.message || "Network error occurred",
    };
  }
}

/**
 * Push multiple files to GitHub repository
 */
export async function pushFilesToGitHub(
  owner: string,
  repo: string,
  files: Array<{ path: string; content: string }>,
  token: string,
  branch: string = "main"
): Promise<{ success: boolean; results: Array<{ path: string; success: boolean; sha?: string; error?: string }> }> {
  const results = [];

  for (const file of files) {
    console.log(`\n📁 Processing ${file.path}...`);
    const result = await pushFileToGitHub(owner, repo, file.path, file.content, token, branch);
    results.push({
      path: file.path,
      ...result,
    });

    // If one file fails, continue with others but mark overall as failed
    if (!result.success) {
      console.error(`❌ Failed to push ${file.path}: ${result.error}`);
    }
  }

  const allSuccessful = results.every(r => r.success);

  return {
    success: allSuccessful,
    results,
  };
}