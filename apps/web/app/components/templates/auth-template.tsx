interface AuthTemplateProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthTemplate({ children, footer }: AuthTemplateProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <main className="w-full max-w-md">
        {children}
        {footer && (
          <footer className="mt-8 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            {footer}
          </footer>
        )}
      </main>
    </div>
  );
}
