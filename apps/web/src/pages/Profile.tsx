import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { BadgeCheck, Copy, ExternalLink, GraduationCap, Github, Globe, Linkedin, MapPin, MessageSquare, Pencil, Share2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, LinkButton, Reveal, Skeleton } from '@/components/ui';
import { CountUp, EvidenceLegend, MatchScoreRing, Meter, SkillChip } from '@/components/signature';
import { ImportPanel, SkillsEditor } from '@/components/profile';
import { useApp } from '@/lib/store';
import { api, post, type PublicUser } from '@/lib/api';
import { errMsg } from '@/lib/queries';

const href = (u: string) => (u.startsWith('http') ? u : `https://${u}`);

export default function Profile() {
  const { username } = useParams();
  const me = useApp((s) => s.user)!;
  const toast = useApp((s) => s.toast);
  const nav = useNavigate();
  const isOwn = !username || username === me.username;
  const other = useQuery({ queryKey: ['user', username], enabled: !isOwn, queryFn: () => api<{ user: PublicUser }>(`/users/${username}`).then((d) => d.user) });
  const [editing, setEditing] = useState(false);
  const t: PublicUser | undefined = isOwn ? me : other.data;
  if (!isOwn && other.isLoading) return <Skeleton className="mx-auto h-96 max-w-3xl" />;
  if (!isOwn && other.isError) return <ErrorState onRetry={other.refetch} />;
  if (!t) return <EmptyState title="Profile not found" body="That person may have changed their username." />;
  const url = `launchloop.app/u/${t.username}`;
  const canMessage = !isOwn;

  const message = async () => {
    try { await post('/threads', { to: t.id, subject: 'Hello from LaunchLoop', text: `Hi ${t.name.split(' ')[0]}, I came across your profile and would love to chat.` }); nav('/inbox'); } catch (e) { toast({ title: errMsg(e), tone: 'warn' }); }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Card className="relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32" style={{ background: 'var(--glow)' }} />
        <div className="relative flex flex-wrap items-start gap-5">
          <Avatar name={t.name} hue={t.hue} size={84} />
          <div className="min-w-0 flex-1">
            <h1 className="tight text-3xl font-semibold">{t.name}</h1>
            <p className="mt-1 text-muted">{t.headline || (isOwn ? 'Add a headline in Settings' : '')}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
              {t.college && <span className="inline-flex items-center gap-1.5"><GraduationCap size={14} />{t.college}</span>}
              {t.location && <span className="inline-flex items-center gap-1.5"><MapPin size={14} />{t.location}</span>}
              {t.links.github && <a href={href(t.links.github)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-accent"><Github size={14} />GitHub</a>}
              {t.links.linkedin && <a href={href(t.links.linkedin)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-accent"><Linkedin size={14} />LinkedIn</a>}
              {t.links.website && <a href={href(t.links.website)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-accent"><Globe size={14} />Website</a>}
            </div>
            {t.bio && <p className="mt-4 max-w-xl text-sm text-muted">{t.bio}</p>}
          </div>
          <MatchScoreRing score={t.verifiedScore} size={96} stroke={7} label="verified" />
        </div>
        <div className="relative mt-6 flex flex-wrap gap-2">
          <Button onClick={() => { navigator.clipboard?.writeText(`https://${url}`); toast({ title: 'Link copied', body: url, tone: 'good' }); }}><Copy size={14} /> Copy link</Button>
          {isOwn && <Button variant={editing ? 'primary' : 'outline'} onClick={() => setEditing((e) => !e)}><Pencil size={14} /> {editing ? 'Done editing' : 'Edit skills'}</Button>}
          {isOwn && <LinkButton to="/settings" variant="outline">Edit details</LinkButton>}
          {canMessage && <Button variant="primary" onClick={message}><MessageSquare size={14} /> Message</Button>}
          {isOwn && <Badge tone="good" className="self-center"><BadgeCheck size={11} /> Visible to recruiters</Badge>}
        </div>
      </Card>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {([[t.interviewsDone, 'Interviews', ''], [t.tasksDone, 'Tasks accepted', ''], [t.earned, 'Earned', '₹']] as const).map(([n, l, p]) => (
          <Reveal key={l}><Card className="p-5"><p className="num text-3xl font-semibold"><CountUp to={n} prefix={p} /></p><p className="text-sm text-muted">{l}</p></Card></Reveal>
        ))}
      </div>

      {isOwn && editing && <Reveal className="mt-4"><Card className="space-y-5 p-6"><h2 className="tight font-semibold">Import evidence</h2><ImportPanel /><h2 className="tight pt-2 font-semibold">Your skills</h2><SkillsEditor /></Card></Reveal>}

      {!(isOwn && editing) && (
        <Reveal className="mt-4">
          <Card className="p-6">
            <div className="flex items-center justify-between"><h2 className="tight font-semibold">Skills & evidence</h2>{isOwn && <Link to="/interview/new" className="text-[13px] text-accent hover:underline">Verify more →</Link>}</div>
            {t.skills.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-border-strong p-6 text-center text-sm text-muted">{isOwn ? <>No skills yet. <button className="text-accent hover:underline" onClick={() => setEditing(true)}>Add some or import GitHub</button>.</> : 'This person hasn’t added skills yet.'}</div>
            ) : (
              <div className="mt-4 space-y-3.5">
                {t.skills.map((s, i) => (
                  <motion.div key={s.name} layout className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[160px_1fr_auto]">
                    <SkillChip name={s.name} evidence={s.evidence} source={s.source} />
                    <div className="order-last col-span-2 sm:order-none sm:col-span-1"><Meter value={s.level} delay={i * 0.06} /></div>
                    <span className="num text-sm">{s.level}</span>
                  </motion.div>
                ))}
              </div>
            )}
            <div className="mt-6 border-t border-border pt-4"><EvidenceLegend /></div>
          </Card>
        </Reveal>
      )}
      {isOwn && <p className="mt-4 text-center text-xs text-faint">Skills upgrade automatically after interviews, GitHub imports and accepted tasks. <a href={`https://${url}`} onClick={(e) => e.preventDefault()} className="inline-flex items-center gap-1"><Share2 size={11} />{url}<ExternalLink size={10} /></a></p>}
    </div>
  );
}
