import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, CalendarClock, FlaskConical, Inbox, Mic, Plus, Asterisk, UserSearch, Video } from 'lucide-react';
import { readiness, readinessTotal } from '@launchloop/shared';
import { Avatar, Badge, Card, EmptyState, LinkButton, PageHeader, Skeleton } from '@/components/ui';
import { CountUp, EvidenceLegend, MatchScoreRing, Meter, SkillChip } from '@/components/signature';
import { useApp, useRole } from '@/lib/store';
import { useApplications, useBookings, useCofounders, useJobs, useLatestInterview, useMyJobs, useMyTasks, useTasks, useThreads, useVenture } from '@/lib/queries';
import { EASE, inr, timeLeft } from '@/lib/utils';
import { ago } from '@/components/shell';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } };
function Bento({ children }: { children: ReactNode }) {
  return <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-12">{children}</motion.div>;
}
function Cell({ span, children }: { span: string; children: ReactNode }) {
  return <motion.div variants={item} className={span}>{children}</motion.div>;
}
const Title = ({ children, to, link }: { children: ReactNode; to?: string; link?: string }) => (
  <div className="mb-3 flex items-center justify-between"><h2 className="tight font-semibold">{children}</h2>{to && <Link to={to} className="flex items-center gap-1 text-[13px] text-accent hover:underline">{link} <ArrowRight size={13} /></Link>}</div>
);

function InboxCard() {
  const { data } = useThreads();
  const t = data?.threads.slice(0, 3) ?? [];
  return (
    <Card className="h-full p-5">
      <Title to="/inbox" link="Open inbox">Recent messages</Title>
      {t.length === 0 ? <p className="text-sm text-muted">No conversations yet. Applying to a role or accepting a task starts one.</p> : (
        <div className="space-y-1.5">{t.map((x) => (
          <Link key={x.id} to="/inbox" state={{ open: x.id }} className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-surface-2">
            {x.other && <Avatar name={x.other.name} hue={x.other.hue} size={32} />}
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{x.other?.name}</p><p className="truncate text-xs text-muted">{x.last?.text}</p></div>
            <div className="text-right"><p className="num text-[11px] text-faint">{ago(x.lastAt)}</p>{x.unread > 0 && <span className="mt-1 inline-block h-2 w-2 rounded-full bg-accent" />}</div>
          </Link>
        ))}</div>
      )}
    </Card>
  );
}

function TalentDash() {
  const user = useApp((s) => s.user)!;
  const jobs = useJobs();
  const apps = useApplications();
  const tasks = useTasks();
  const bookings = useBookings();
  const iv = useLatestInterview();
  const verifiedCount = user.skills.filter((s) => s.evidence === 'interview' || s.evidence === 'task').length;
  const strength = Math.min(100, 20 + (user.headline ? 10 : 0) + (user.bio ? 10 : 0) + Math.min(user.skills.length, 6) * 3 + (user.github ? 8 : 0) + verifiedCount * 5 + user.interviewsDone * 12 + user.tasksDone * 10);
  const top = jobs.data?.slice(0, 3) ?? [];
  const next = bookings.data?.[0];
  const steps = [
    [user.skills.length >= 3, 'Add at least 3 skills', '/profile'],
    [!!user.github, 'Verify your GitHub account', '/profile'],
    [user.interviewsDone > 0, 'Complete the AI interview', '/interview/new'],
    [(apps.data?.length ?? 0) > 0, 'Apply to your first role', '/jobs'],
    [user.tasksDone > 0, 'Get a proof task accepted', '/tasks'],
  ] as const;

  return (
    <Bento>
      <Cell span="md:col-span-4">
        <Card className="flex h-full flex-col items-center justify-center p-6 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Verified score</p>
          <div className="mt-4"><MatchScoreRing score={user.verifiedScore} size={140} stroke={9} label="of 100" /></div>
          <p className="mt-4 text-sm text-muted">{user.skills.length === 0 ? 'Add skills to get your first score.' : user.interviewsDone === 0 ? 'Take the AI interview to lift this.' : 'Rising with every proof.'}</p>
          <LinkButton to={user.skills.length ? '/interview/new' : '/profile'} variant="primary" className="mt-4"><Mic size={15} /> {user.skills.length === 0 ? 'Build profile' : user.interviewsDone === 0 ? 'Start interview' : 'Retake interview'}</LinkButton>
        </Card>
      </Cell>
      <Cell span="md:col-span-8">
        <Card className="h-full p-5">
          <Title to="/jobs" link="All jobs">Top matches for you</Title>
          {jobs.isLoading ? <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[68px]" />)}</div> : user.skills.length === 0 ? <EmptyState title="Matches start with skills" body="Add a few skills or import GitHub and we’ll rank every open role for you." action={<LinkButton to="/profile" variant="primary">Add skills</LinkButton>} /> : (
            <div className="divide-y divide-border">{top.map(({ job, match }, i) => (
              <Link key={job.id} to={`/jobs?open=${job.id}`} className="-mx-2 rounded-md px-2 py-3 transition-colors hover:bg-surface-2 flex items-center gap-4">
                <MatchScoreRing score={match?.total ?? 0} size={52} stroke={4} delay={0.1 * i} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{job.title}</p><p className="text-xs text-muted">{job.startup} · {job.location}</p></div>
                <div className="hidden gap-1.5 sm:flex">{match?.matched.slice(0, 2).map((s) => <SkillChip key={s.name} size="sm" name={s.name} evidence={s.evidence} />)}</div>
              </Link>
            ))}</div>
          )}
        </Card>
      </Cell>
      <Cell span="md:col-span-4">
        <Card className="h-full p-5">
          <h2 className="tight font-semibold">Profile strength</h2>
          <p className="num mt-3 text-4xl font-semibold"><CountUp to={strength} suffix="%" /></p>
          <div className="mt-3"><Meter value={strength} /></div>
          <ul className="mt-4 space-y-2 text-[13px]">
            {steps.map(([done, label, to]) => (
              <li key={label}><Link to={to} className={`flex items-center gap-2 ${done ? 'text-good' : 'text-muted hover:text-text'}`}><span className="w-3">{done ? '✓' : '○'}</span>{label}</Link></li>
            ))}
          </ul>
        </Card>
      </Cell>
      <Cell span="md:col-span-8">
        <Card className="h-full p-5">
          <Title to="/profile" link="Edit profile">Your skills & evidence</Title>
          {user.skills.length ? <div className="flex flex-wrap gap-2">{user.skills.map((s) => <SkillChip key={s.name} name={s.name} evidence={s.evidence} level={s.level} source={s.source} />)}</div> : <p className="text-sm text-muted">No skills yet.</p>}
          <div className="mt-5 border-t border-border pt-4"><EvidenceLegend /></div>
          {iv.data?.interview && <p className="mt-3 text-[13px] text-muted">Latest interview: <span className="num font-semibold text-text">{iv.data.interview.overall}/100</span> · <Link to="/interview/latest/report" className="text-accent hover:underline">view report</Link></p>}
        </Card>
      </Cell>
      <Cell span="md:col-span-4">
        <Card className="h-full p-5">
          <Title to="/applications" link="Track">Applications</Title>
          {apps.data?.length ? (
            <div className="space-y-2">{apps.data.slice(0, 3).map((a) => <div key={a.id} className="flex items-center justify-between gap-2 text-sm"><span className="truncate">{a.job?.title}</span><Badge tone={a.stage === 'Rejected' ? 'danger' : a.stage === 'Applied' ? 'neutral' : 'good'}>{a.stage}</Badge></div>)}</div>
          ) : <p className="text-sm text-muted">You haven&apos;t applied yet. <Link to="/jobs" className="text-accent hover:underline">Browse roles</Link></p>}
        </Card>
      </Cell>
      <Cell span="md:col-span-4">
        <Card className="h-full p-5">
          <Title to="/tasks" link="Browse">Open proof tasks</Title>
          <div className="divide-y divide-border">{(tasks.data ?? []).slice(0, 2).map((t) => (
            <Link key={t.id} to={`/tasks/${t.id}`} className="-mx-2 rounded-md px-2 py-3 transition-colors hover:bg-surface-2 flex items-center justify-between gap-3">
              <div className="min-w-0"><p className="truncate text-sm font-medium">{t.title}</p><p className="text-xs text-muted">{t.startup} · {timeLeft(t.deadline)}</p></div>
              <div className="text-right"><p className="num font-semibold">{inr(t.reward)}</p>{t.mine && <Badge tone="good">Submitted</Badge>}</div>
            </Link>
          ))}</div>
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-accent-soft p-3 text-[13px]"><Asterisk size={14} className="shrink-0 text-accent" /> Earned so far: <span className="num font-semibold">{inr(user.earned)}</span></div>
        </Card>
      </Cell>
      <Cell span="md:col-span-4">
        <Card className="h-full p-5">
          <Title to="/mentors" link="Mentors">Next mentor session</Title>
          {next ? (
            <div className="flex items-center gap-3">{next.mentor && <Avatar name={next.mentor.name} hue={next.mentor.hue} size={44} />}<div><p className="font-medium">{next.mentor?.name}</p><p className="flex items-center gap-1.5 text-sm text-muted"><CalendarClock size={14} /> {next.slot}</p></div></div>
          ) : <p className="text-sm text-muted">Nothing booked. Mentors have free and ₹499 slots this week.</p>}
          {next && <a href={next.link} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"><Video size={14} /> Open video room</a>}
        </Card>
      </Cell>
      <Cell span="md:col-span-12"><InboxCard /></Cell>
    </Bento>
  );
}

function FounderDash() {
  const venture = useVenture();
  const co = useCofounders();
  const mine = useMyJobs();
  const user = useApp((s) => s.user)!;
  const v = venture.data;
  const r = v ? readiness({ text: v.text, facts: v.facts, teamSize: v.teamSize, hasUsers: v.hasUsers }) : null;
  const total = r ? readinessTotal(r) : 0;
  const top = co.data?.[0];
  const stages = [['Idea validated', !!v?.analysis], ['Prototype', !!v?.facts.hasPrototype], ['First users', !!v?.hasUsers], ['Funding ready', !!v?.facts.dpiitRegistered]] as const;
  const current = stages.findIndex(([, d]) => !d);
  return (
    <Bento>
      <Cell span="md:col-span-4">
        <Card className="flex h-full flex-col items-center p-6 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Readiness</p>
          {r ? <div className="mt-4"><MatchScoreRing score={total} size={140} stroke={9} label="of 100" /></div> : <div className="mt-6 text-sm text-muted">Describe your idea in the Studio to get a readiness score.</div>}
          <LinkButton to="/studio" variant="primary" className="mt-5"><FlaskConical size={15} /> {v?.analysis ? 'Open Studio' : 'Validate my idea'}</LinkButton>
        </Card>
      </Cell>
      <Cell span="md:col-span-8">
        <Card className="h-full p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="tight font-semibold">Venture journey</h2><Badge tone="accent">{user.founder?.stage ?? 'Idea'}</Badge></div>
          <ol className="grid gap-3 sm:grid-cols-4">{stages.map(([s, done], i) => <li key={s} className={`rounded-lg border p-3 text-sm ${done ? 'border-good/30 bg-good/5' : i === current ? 'border-accent/40 bg-accent-soft' : 'border-border'}`}><span className="num text-xs text-faint">0{i + 1}</span><p className="mt-1 font-medium">{s}</p><p className="text-xs text-muted">{done ? 'Done' : i === current ? 'Next up' : 'Later'}</p></li>)}</ol>
        </Card>
      </Cell>
      <Cell span="md:col-span-6">
        <Card className="h-full p-5">
          <Title to="/studio/cofounders" link="See all">Top co-founder match</Title>
          {top ? <div className="flex items-center gap-3"><Avatar name={top.founder.name} hue={top.founder.hue} size={44} /><div className="flex-1"><p className="font-medium">{top.founder.name}</p><p className="text-sm text-muted">{top.founder.headline}</p></div><MatchScoreRing score={top.compat.total} size={52} stroke={4} /></div> : user.founder?.has.length ? <p className="text-sm text-muted">No matches yet.</p> : <p className="text-sm text-muted">Tell us what you have and need in <Link to="/settings" className="text-accent hover:underline">Settings</Link> to get matches.</p>}
        </Card>
      </Cell>
      <Cell span="md:col-span-6">
        <Card className="h-full p-5">
          <Title to="/recruiter" link="Hiring">Your open roles</Title>
          {mine.data?.length ? <div className="space-y-2">{mine.data.slice(0, 3).map(({ job }) => <div key={job.id} className="flex items-center justify-between text-sm"><span className="truncate">{job.title}</span><Badge tone="accent">{job.applicants} applicants</Badge></div>)}</div> : <div className="text-sm text-muted">You haven&apos;t posted a role yet. <Link to="/recruiter" className="text-accent hover:underline">Post one</Link></div>}
        </Card>
      </Cell>
      <Cell span="md:col-span-12"><InboxCard /></Cell>
    </Bento>
  );
}

function RecruiterDash() {
  const jobs = useMyJobs();
  const tasks = useMyTasks();
  const threads = useThreads();
  const applicants = (jobs.data ?? []).reduce((a, j) => a + j.job.applicants, 0);
  const stats = [[jobs.data?.length ?? 0, 'Roles posted'], [applicants, 'Applicants'], [tasks.data?.length ?? 0, 'Proof tasks'], [threads.data?.unread ?? 0, 'Unread messages']] as const;
  const pending = (tasks.data ?? []).find((t) => t.submissions > 0);
  return (
    <Bento>
      {stats.map(([n, l]) => <Cell key={l} span="md:col-span-3"><Card className="p-5"><p className="num text-4xl font-semibold"><CountUp to={n} /></p><p className="mt-1 text-sm text-muted">{l}</p></Card></Cell>)}
      {pending && <Cell span="md:col-span-12"><Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="tight font-semibold">{pending.title} is ready for review</h2><p className="text-sm text-muted">{pending.submissions} submissions · AI reviewed and ranked</p></div><LinkButton to={`/tasks/${pending.id}/review`} variant="primary">Review shortlist <ArrowRight size={15} /></LinkButton></div></Card></Cell>}
      <Cell span="md:col-span-6"><Card className="p-5"><Title to="/recruiter" link="Console">Roles</Title>{jobs.data?.length ? <div className="space-y-2">{jobs.data.slice(0, 4).map(({ job }) => <div key={job.id} className="flex items-center justify-between text-sm"><span className="truncate">{job.title}</span><span className="num text-muted">{job.applicants}</span></div>)}</div> : <EmptyState title="Post your first role" body="Use the AI writer and start receiving ranked applicants." action={<LinkButton to="/recruiter" variant="primary"><Plus size={14} /> New job</LinkButton>} />}</Card></Cell>
      <Cell span="md:col-span-6"><Card className="p-5"><Title to="/talent" link="Search">Find talent</Title><p className="text-sm text-muted">Search verified people by skill in plain language, like “react interview-verified”.</p><LinkButton to="/talent" className="mt-4"><UserSearch size={14} /> Open search</LinkButton></Card></Cell>
      <Cell span="md:col-span-12"><InboxCard /></Cell>
    </Bento>
  );
}

function MentorDash() {
  const bookings = useBookings();
  return (
    <Bento>
      <Cell span="md:col-span-4"><Card className="p-5"><Video className="text-accent" size={20} /><p className="num mt-4 text-4xl font-semibold"><CountUp to={bookings.data?.length ?? 0} /></p><p className="text-sm text-muted">Upcoming sessions</p></Card></Cell>
      <Cell span="md:col-span-8">
        <Card className="p-5">
          <Title to="/sessions" link="All sessions">Next up</Title>
          {bookings.data?.length ? <div className="divide-y divide-border">{bookings.data.slice(0, 3).map((b) => <div key={b.id} className="flex items-center gap-3 py-3">{b.mentee && <Avatar name={b.mentee.name} hue={b.mentee.hue} />}<div className="min-w-0 flex-1"><p className="text-sm font-medium">{b.mentee?.name}</p><p className="truncate text-xs text-muted">{b.slot} · {b.goal}</p></div></div>)}</div> : <p className="text-sm text-muted">No bookings yet. Your profile is live in the directory.</p>}
        </Card>
      </Cell>
      <Cell span="md:col-span-12"><InboxCard /></Cell>
    </Bento>
  );
}

export default function Dashboard() {
  const role = useRole();
  const user = useApp((s) => s.user)!;
  const first = user.name.split(' ')[0];
  const titles = { talent: `Welcome back, ${first}`, founder: `Good to see you, ${first}`, recruiter: 'Hiring overview', mentor: 'Mentor overview' } as const;
  return (
    <>
      <PageHeader eyebrow={role} title={titles[role]} sub="Everything that changed since you were last here." actions={<LinkButton to="/inbox" variant="outline" size="sm"><Inbox size={14} /> Inbox</LinkButton>} />
      {role === 'talent' && <TalentDash />}
      {role === 'founder' && <FounderDash />}
      {role === 'recruiter' && <RecruiterDash />}
      {role === 'mentor' && <MentorDash />}
    </>
  );
}


