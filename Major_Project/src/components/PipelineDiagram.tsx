const PipelineDiagram = ({ active = false }: { active?: boolean }) => {
  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="rounded-2xl border border-border bg-card/70 p-6 text-center shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">CI/CD Pipeline Overview</h2>
        <div className="grid grid-cols-3 gap-4 text-left">
          <div className="rounded-xl border border-border p-4 bg-background/80">
            <h3 className="font-semibold mb-2">GitHub</h3>
            <p className="text-sm text-muted-foreground">Source code and workflow definitions.</p>
          </div>
          <div className="rounded-xl border border-border p-4 bg-background/80">
            <h3 className="font-semibold mb-2">Actions</h3>
            <p className="text-sm text-muted-foreground">CI/CD automation, build, and deploy jobs.</p>
          </div>
          <div className="rounded-xl border border-border p-4 bg-background/80">
            <h3 className="font-semibold mb-2">EC2</h3>
            <p className="text-sm text-muted-foreground">Deploy artifact to production infrastructure.</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{active ? "Pipeline is ready to generate and push." : "Enter a repo URL to preview the generated pipeline."}</p>
      </div>
    </div>
  );
};

export default PipelineDiagram;

