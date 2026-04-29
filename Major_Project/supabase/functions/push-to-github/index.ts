import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { owner, repo, token, files, branch } = await req.json();

    if (!owner || !repo || !token || !files) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const baseUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const headers = {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Pipeline.sh",
    };

    // Get the latest commit SHA
    const refRes = await fetch(`${baseUrl}/git/ref/heads/${branch}`, { headers });
    if (!refRes.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to get branch reference" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const refData = await refRes.json();
    const latestCommitSha = refData.object.sha;

    // Get the tree of the latest commit
    const commitRes = await fetch(`${baseUrl}/git/commits/${latestCommitSha}`, {
      headers,
    });
    const commitData = await commitRes.json();
    const baseTreeSha = commitData.tree.sha;

    // Create blobs for each file
    const blobShas: { [key: string]: string } = {};
    const fileEntries = [
      { path: "Dockerfile", content: files.dockerfile },
      { path: "docker-compose.yml", content: files.dockerCompose },
      { path: ".github/workflows/ci.yml", content: files.githubAction },
      { path: "Jenkinsfile", content: files.jenkinsfile },
      {
        path: "CI_CD_PIPELINE.md",
        content: `# CI/CD Pipeline\n\n${files.summary}`,
      },
    ];

    for (const file of fileEntries) {
      const blobRes = await fetch(`${baseUrl}/git/blobs`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          content: file.content,
          encoding: "utf-8",
        }),
      });
      const blobData = await blobRes.json();
      blobShas[file.path] = blobData.sha;
    }

    // Create a new tree
    const treeItems = fileEntries.map((file) => ({
      path: file.path,
      mode: "100644",
      type: "blob",
      sha: blobShas[file.path],
    }));

    const treeRes = await fetch(`${baseUrl}/git/trees`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems,
      }),
    });
    const treeData = await treeRes.json();
    const newTreeSha = treeData.sha;

    // Create a new commit
    const commitMessage = "🚀 Auto-generated CI/CD pipeline from Pipeline.sh";
    const newCommitRes = await fetch(`${baseUrl}/git/commits`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: commitMessage,
        tree: newTreeSha,
        parents: [latestCommitSha],
        author: {
          name: "Pipeline.sh",
          email: "noreply@pipeline.sh",
          date: new Date().toISOString(),
        },
        committer: {
          name: "Pipeline.sh",
          email: "noreply@pipeline.sh",
          date: new Date().toISOString(),
        },
      }),
    });
    const newCommitData = await newCommitRes.json();
    const newCommitSha = newCommitData.sha;

    // Update the branch reference
    const updateRefRes = await fetch(`${baseUrl}/git/refs/heads/${branch}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        sha: newCommitSha,
        force: false,
      }),
    });

    if (!updateRefRes.ok) {
      const errorData = await updateRefRes.json();
      return new Response(JSON.stringify({ error: errorData.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully pushed to ${owner}/${repo}`,
        commitSha: newCommitSha,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
