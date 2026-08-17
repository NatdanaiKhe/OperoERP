import Link from 'next/link';
import { Card } from '@/app/components/atoms/card';
import { ActivityItem } from '@/app/components/molecules/activity-item';

interface ActivityFeedItem {
  icon: React.ReactNode;
  description: React.ReactNode;
  timestamp: string;
  actor?: string;
}

interface ActivityFeedProps {
  items: ActivityFeedItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-border/30 px-5 py-4">
        <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
        {/* ponytail: View All links to a placeholder route */}
        <Link
          href="/dashboard/activity"
          className="text-sm text-primary hover:underline"
        >
          View All
        </Link>
      </div>
      <ul className="divide-y divide-border/30 px-5">
        {items.map((item, i) => (
          <ActivityItem key={i} {...item} />
        ))}
      </ul>
    </Card>
  );
}
