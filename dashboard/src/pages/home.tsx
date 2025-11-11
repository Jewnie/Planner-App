export default function HomePage() {
  return (
    <section className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-card-foreground">
          Welcome back
        </h2>
        <p className="text-sm text-muted-foreground">
          Select a section from the sidebar to get started.
        </p>
      </div>
    </section>
  )
}

