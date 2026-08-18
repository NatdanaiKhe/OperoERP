interface ActivityItemProps {
  icon: React.ReactNode;
  description: React.ReactNode;
  timestamp: string;
  actor?: string;
}

export function ActivityItem({ icon, description, timestamp, actor }: ActivityItemProps) {
  return (
    <li className="flex gap-3 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{description}</p>
        <p className="text-xs text-muted-foreground">
          {actor ? `${actor} • ` : ''}
          {timestamp}
        </p>
      </div>
    </li>
  );
}
