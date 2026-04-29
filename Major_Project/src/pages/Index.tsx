import { useState } from "react";
import { Github, Loader2, Terminal, Zap, Download, AlertTriangle, GitBranch } from "lucide-react";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { pushFilesToGitHub } from "@/lib/github";
import { generateFallbackPipeline } from "@/lib/localGenerator";
import ErrorBoundary from "@/components/ErrorBoundary";
import PipelineDiagram from "@/components/PipelineDiagram";

interface PipelineFiles {
  summary: string;
  dockerfile: string;
  dockerCompose: string;
  githubAction: string;
  jenkinsfile: string;
}
interface RepoContext {
  owner: string; repo: string; defaultBranch: string;
  language: string | null; detectedFramework: string; detectedRuntime: string;
}

const Index = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<PipelineFiles | null>(null);
  const [ctx, setCtx] = useState<RepoContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [githubToken, setGithubToken] = useState("");
  const [pushing, setPushing] = useState(false);

  // Calculate target repository for display
  const parseGithubRepo = (rawUrl: string) => {
    const match = rawUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:$|[/?#])/i);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  };

  const urlRepo = parseGithubRepo(url || "");
  const targetOwner = urlRepo?.owner || ctx?.owner?.trim();
  const targetRepo = urlRepo?.repo || ctx?.repo?.trim();

  const generate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!url.trim()) { toast.error("Paste a GitHub URL first"); return; }
    setLoading(true); setError(null); setFiles(null); setCtx(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-pipeline", {
        body: { url: url.trim() },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data || data?.error || !data.files || !data.context) {
        throw new Error(data?.error || "Invalid response from generator");
      }

      setFiles(data.files);
      setCtx(data.context);
      toast.success("Pipeline generated");
    } catch (err: any) {
      console.error("Supabase generation failed, using fallback:", err);
      const fallback = generateFallbackPipeline(url.trim());
      setFiles(fallback.files);
      setCtx(fallback.context);
      toast.success("Pipeline generated locally as fallback");
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadZip = async () => {
    if (!files) return;
    const zip = new JSZip();
    zip.file("Dockerfile", files.dockerfile);
    zip.file("docker-compose.yml", files.dockerCompose);
    zip.folder(".github/workflows")?.file("ci.yml", files.githubAction);
    zip.file("Jenkinsfile", files.jenkinsfile);
    zip.file("README.md", `# CI/CD Pipeline for ${ctx?.owner}/${ctx?.repo}\n\n${files.summary}\n`);
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${ctx?.repo || "pipeline"}-cicd.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("ZIP downloaded");
  };

  const pushToGithub = async () => {
    if (!files || !ctx || !githubToken.trim()) {
      toast.error("GitHub token required");
      return;
    }

    const token = githubToken.trim();
    const owner = targetOwner;
    const repo = targetRepo;

    if (!owner || !repo) {
      toast.error("Unable to determine repository owner/repo. Please check the GitHub URL.");
      return;
    }

    setPushing(true);
    console.log(`🔐 Token: ${token.substring(0, 20)}...`);
    console.log(`📦 Repo: ${owner}/${repo}`);

    const fileEntries = [
      { path: "Dockerfile", content: files.dockerfile },
      { path: "docker-compose.yml", content: files.dockerCompose },
      { path: ".github/workflows/ci.yml", content: files.githubAction },
      { path: "Jenkinsfile", content: files.jenkinsfile },
      { path: "CI_CD_PIPELINE.md", content: `# CI/CD Pipeline\n\n${files.summary}` },
    ];

    try {
      // Validate token first
      const validateRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      });

      if (!validateRes.ok) {
        const validateErr = await validateRes.json();
        console.error("❌ Token validation failed:", validateErr);
        throw new Error(`Invalid token or missing permissions: ${validateErr.message || "Check your token scope"}`);
      }

      const userData = await validateRes.json();
      console.log(`✅ Token valid for user: ${userData.login}`);

      // Verify repository access and get default branch
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      });

      if (!repoRes.ok) {
        const repoErr = await repoRes.json();
        console.error("❌ Repo verification failed:", repoErr);
        throw new Error(`Repository not found or inaccessible: ${owner}/${repo}. Make sure the token has access to this repository.`);
      }

      const repoData = await repoRes.json();
      const defaultBranch = repoData.default_branch || "main";
      console.log(`✅ Repo verified. Default branch: ${defaultBranch}`);

      // Push all files using the utility function
      const pushResult = await pushFilesToGitHub(owner, repo, fileEntries, token, defaultBranch);

      if (!pushResult.success) {
        const failedFiles = pushResult.results.filter(r => !r.success);
        throw new Error(`Failed to push ${failedFiles.length} file(s). Check console for details.`);
      }

      toast.success(`✅ Successfully pushed pipeline to ${owner}/${repo}`);
      console.log(`🎉 All files pushed successfully to ${owner}/${repo}`);
      setGithubToken("");

    } catch (err: any) {
      console.error("🔴 Error during push:", err);
      toast.error(err.message || "Push failed");
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="min-h-screen grid-dots">
      <header className="border-b border-border/60 backdrop-blur bg-background/60 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-neon" />
            <span className="font-bold tracking-wider">PIPELINE<span className="text-neon">.</span>SH</span>
          </div>
          <Badge variant="outline" className="border-primary/40 text-neon text-[10px]">
            <Zap className="h-3 w-3 mr-1" /> AI-POWERED
          </Badge>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <section className="text-center mb-10">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            <span className="text-foreground">Generate CI/CD</span>{" "}
            <span className="text-neon">from any repo</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
            Paste a GitHub URL. Get a tailored Dockerfile, docker-compose, GitHub Action,
            and Jenkinsfile — analyzed and generated by AI in seconds.
          </p>
        </section>

        <form onSubmit={generate} className="max-w-3xl mx-auto mb-8">
          <div className="flex flex-col sm:flex-row gap-2 p-2 rounded-lg border border-border bg-card/60 backdrop-blur">
            <div className="flex items-center gap-2 flex-1 px-3">
              <Github className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="border-0 bg-transparent focus-visible:ring-0 px-0 font-mono text-sm"
                disabled={loading}
              />
            </div>
            <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wide">
              {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> ANALYZING</>) : (<>GENERATE →</>)}
            </Button>
          </div>
          <div className="mt-3 text-xs text-muted-foreground text-center">
            Try: <button type="button" onClick={() => setUrl("https://github.com/vercel/next.js")} className="text-cyan hover:underline">vercel/next.js</button>
            {" · "}
            <button type="button" onClick={() => setUrl("https://github.com/expressjs/express")} className="text-cyan hover:underline">expressjs/express</button>
          </div>
        </form>

        <ErrorBoundary>
          <PipelineDiagram active={loading || !!files} />
        </ErrorBoundary>

        {error && (
          <div className="max-w-3xl mx-auto mt-6 rounded-md border border-destructive/40 bg-destructive/10 p-4 flex gap-3 items-start">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
            <div className="text-sm text-destructive-foreground">{error}</div>
          </div>
        )}

        {loading && (
          <div className="max-w-3xl mx-auto mt-8 rounded-md border border-border bg-terminal p-4 font-mono text-xs space-y-1">
            <div className="text-neon">$ pipeline analyze {url}</div>
            <div className="text-muted-foreground">→ fetching repository metadata...</div>
            <div className="text-muted-foreground">→ scanning root files & dependencies...</div>
            <div className="text-muted-foreground">→ detecting runtime + framework...</div>
            <div className="text-cyan glow-cursor">→ generating pipeline files</div>
          </div>
        )}

        {files && ctx && (
          <section className="mt-10 space-y-6">
            <div className="rounded-md border border-border bg-card/60 p-5">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge className="bg-primary/20 text-neon border-primary/40">{ctx.detectedRuntime}</Badge>
                <Badge variant="outline" className="border-accent/40 text-cyan">{ctx.detectedFramework}</Badge>
                {ctx.language && <Badge variant="outline">{ctx.language}</Badge>}
                <Badge variant="outline">branch: {ctx.defaultBranch}</Badge>
                <span className="text-xs text-muted-foreground ml-auto">{ctx.owner}/{ctx.repo}</span>
              </div>
              <p className="text-base text-foreground/80 leading-7">{files.summary}</p>
            </div>

            {/* Download Section */}
            <div className="rounded-md border border-border/40 bg-gradient-to-r from-primary/5 to-accent/5 p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Download className="h-4 w-4 text-neon" /> Export Pipeline Files
              </h3>
              <Button onClick={downloadZip} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold py-2 h-auto">
                <Download className="h-4 w-4 mr-2" /> Download as ZIP
              </Button>
            </div>

            {/* GitHub Push Section */}
            <div className="rounded-2xl border border-cyan/30 bg-slate-950/70 p-6 shadow-[0_0_40px_rgba(56,189,248,0.15)]">
              <h3 className="text-2xl font-bold text-cyan flex items-center gap-2 mb-4">
                <GitBranch className="h-6 w-6" /> Push Generated Pipeline to GitHub
              </h3>
              <p className="text-base text-muted-foreground max-w-2xl mb-6">
                Paste your GitHub Personal Access Token below and click the push button to commit the generated pipeline files directly into your repository.
              </p>

              <div className="space-y-4 mb-6">
                {/* Token Input */}
                <div className="space-y-3">
                  <label className="text-base font-semibold text-foreground block">GitHub Personal Access Token</label>
                  <Input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full text-base font-mono bg-background/90 border-cyan/40 focus:border-cyan focus:ring-cyan/30 py-3 px-4"
                    disabled={pushing}
                  />
                  <p className="text-sm text-muted-foreground">
                    💡 Create a token at <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-cyan hover:underline font-medium">github.com/settings/tokens</a> with <code className="bg-muted px-2 py-1 rounded text-xs font-mono">repo</code> scope.
                  </p>
                </div>
              </div>

              {/* Push Button - Large and Prominent */}
              <button
                onClick={pushToGithub}
                disabled={pushing || !githubToken.trim()}
                className={`w-full py-5 px-6 mb-6 font-bold text-lg rounded-lg flex items-center justify-center gap-3 transition-all duration-200 shadow-2xl border-2 ${
                  pushing || !githubToken.trim()
                    ? 'bg-gray-700 text-gray-400 border-gray-600 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-r from-lime-400 to-green-500 text-black border-lime-300 hover:from-lime-300 hover:to-green-400 hover:shadow-cyan/50'
                }`}
              >
                {pushing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Pushing to GitHub...</span>
                  </>
                ) : !githubToken.trim() ? (
                  <>
                    <span>Enter token to push →</span>
                  </>
                ) : (
                  <>
                    <GitBranch className="h-5 w-5" />
                    <span>🚀 Push Pipeline to {targetOwner}/{targetRepo}</span>
                  </>
                )}
              </button>

              {/* Info Box */}
              <div className="rounded-xl bg-background/40 border border-border p-4 text-sm text-muted-foreground space-y-2">
                <p className="font-semibold text-foreground text-base">What will happen:</p>
                <ul className="list-disc list-inside space-y-2 ml-1">
                  <li>Create or update Dockerfile, docker-compose.yml, GitHub Actions workflow, and Jenkinsfile</li>
                  <li>Upload CI_CD_PIPELINE.md with the generated summary</li>
                  <li>Commit all files to the <code className="bg-muted px-2 py-1 rounded text-xs font-mono">{ctx?.defaultBranch || 'main'}</code> branch of <code className="bg-muted px-2 py-1 rounded text-xs font-mono">{targetOwner}/{targetRepo}</code></li>
                </ul>
              </div>
            </div>

            <Tabs defaultValue="dockerfile" className="w-full">
              <TabsList className="bg-card border border-border w-full justify-start overflow-x-auto">
                <TabsTrigger value="dockerfile">Dockerfile</TabsTrigger>
                <TabsTrigger value="compose">docker-compose.yml</TabsTrigger>
                <TabsTrigger value="gha">GitHub Actions</TabsTrigger>
                <TabsTrigger value="jenkins">Jenkinsfile</TabsTrigger>
              </TabsList>
              <TabsContent value="dockerfile" className="mt-4">
                <FileViewer filename="Dockerfile" content={files.dockerfile} />
              </TabsContent>
              <TabsContent value="compose" className="mt-4">
                <FileViewer filename="docker-compose.yml" content={files.dockerCompose} />
              </TabsContent>
              <TabsContent value="gha" className="mt-4">
                <FileViewer filename=".github/workflows/ci.yml" content={files.githubAction} />
              </TabsContent>
              <TabsContent value="jenkins" className="mt-4">
                <FileViewer filename="Jenkinsfile" content={files.jenkinsfile} />
              </TabsContent>
            </Tabs>
          </section>
        )}
      </main>

      <footer className="border-t border-border/60 mt-20 py-6 text-center text-xs text-muted-foreground">
        Built with Lovable AI · CI/CD generation is a starting point — review before production.
      </footer>
    </div>
  );
};

export default Index;
