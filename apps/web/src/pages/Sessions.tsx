import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { MessageSquare, Video } from 'lucide-react';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui';
import { useBookings } from '@/lib/queries';
import { useApp } from '@/lib/store';
import { inr } from '@/lib/utils';

export default function Sessions() {
  const { data, isLoading, isError, refetch } = useBookings();
  const user = useApp((s) => s.user)!;
  const isMentor = !!user.mentorId;
  return (
    <>
      <PageHeader eyebrow="Sessions" title={isMentor ? 'Your upcoming sessions' : 'Your booked sessions'} sub="Every session has a private video room created at booking time." />
      {isError ? <ErrorState onRetry={refetch} /> : isLoading ? <Skeleton className="h-40" /> : !data?.length ? (
        <EmptyState title="No sessions yet" body={isMentor ? 'When someone books you, it appears here with their goal.' : 'Book a mentor to get a private video room.'} action={!isMentor ? <Link to="/mentors"><Button variant="primary">Find a mentor</Button></Link> : undefined} />
      ) : (
        <div className="space-y-3">{data.map((b, i) => {
          const who = isMentor ? b.mentee : b.mentor;
          return (
            <motion.div key={b.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card hover className="flex flex-wrap items-center gap-4 p-4">
                {who && <Avatar name={who.name} hue={who.hue} size={42} />}
                <div className="min-w-0 flex-1"><p className="font-medium">{who?.name}</p><p className="text-[13px] text-muted">{b.slot}</p><p className="mt-1 line-clamp-2 text-[13px] text-faint">Goal: {b.goal}</p></div>
                <Badge tone={b.price ? 'accent' : 'good'}>{b.price ? inr(b.price) : 'Free'}</Badge>
                <a href={b.link} target="_blank" rel="noopener noreferrer"><Button variant="primary"><Video size={14} /> Join</Button></a>
                <Link to="/inbox"><Button variant="ghost"><MessageSquare size={14} /></Button></Link>
              </Card>
            </motion.div>
          );
        })}</div>
      )}
    </>
  );
}
