interface ErrorStateProps {
  title: string;
  description: string;
  message?: string;
}

export function ErrorState({ title, description, message = "Error loading data" }: ErrorStateProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">{message}</p>
      </div>
    </div>
  );
}