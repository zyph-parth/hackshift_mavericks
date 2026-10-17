import { COFOUNDERS, JOBS, MENTORS, ME_FOUNDER, SUBMISSIONS, TALENTS, TASKS } from '@launchloop/shared';
import { count, insert } from './db';
import { hashPassword, type JobData, type MessageData, type SubmissionData, type TaskData, type ThreadData, type UserData } from './lib';

export const DEMO = {
  talent: { email: 'priya@demo.dev', id: 't_priya' },
  founder: { email: 'arjun@demo.dev', id: 'f_arjun' },
  recruiter: { email: 'recruiter@demo.dev', id: 'u_recruiter' },
  mentor: { email: 'mentor@demo.dev', id: 'u_mentor' },
  password: 'demo1234',
};

const base = (over: Partial<UserData> & Pick<UserData, 'email' | 'name' | 'username'>): UserData => ({
  pw: null,
  roles: ['talent'],
  activeRole: 'talent',
  hue: 20,
  headline: '',
  bio: '',
  college: '',
  location: '',
  skills: [],
  links: {},
  openTo: ['remote', 'internship'],
  interviewsDone: 0,
  tasksDone: 0,
  earned: 0,
  onboarded: true,
  plan: 'free',
  seeded: true,
  ...over,
});

export function seed() {
  if (count('users') > 0) return;
  const demoPw = hashPassword(DEMO.password);

  // talents (Priya is a real, loggable demo account)
  for (const t of TALENTS) {
    const isPriya = t.id === DEMO.talent.id;
    insert<UserData>(
      'users',
      base({
        email: isPriya ? DEMO.talent.email : `${t.username}@seed.launchloop.dev`,
        pw: isPriya ? demoPw : null,
        name: t.name, username: t.username, headline: t.headline, bio: t.bio, college: t.college,
        location: t.location, hue: t.hue, skills: t.skills, openTo: t.openTo,
        interviewsDone: t.interviewsDone, tasksDone: t.tasksDone, earned: t.earned,
        links: isPriya ? { github: 'github.com/priya-sharma', linkedin: 'linkedin.com/in/priya-sharma' } : {},
        seeded: !isPriya,
      }),
      { id: t.id, ref: isPriya ? DEMO.talent.email : `${t.username}@seed.launchloop.dev` },
    );
  }

  // founders
  const founderUser = (f: typeof ME_FOUNDER, login: boolean) =>
    insert<UserData>(
      'users',
      base({
        email: login ? DEMO.founder.email : `${f.name.split(' ')[0].toLowerCase()}@seed.launchloop.dev`,
        pw: login ? demoPw : null,
        name: f.name, username: f.name.toLowerCase().replace(' ', '.'), headline: f.headline, location: f.location, hue: f.hue,
        roles: ['founder'], activeRole: 'founder', seeded: !login,
        founder: { has: f.has, needs: f.needs, commitment: f.commitment, stage: f.stage, values: f.values },
        company: login ? 'InvoiceFlow (pre-seed)' : undefined,
      }),
      { id: f.id, ref: login ? DEMO.founder.email : `${f.name.split(' ')[0].toLowerCase()}@seed.launchloop.dev` },
    );
  founderUser(ME_FOUNDER, true);
  COFOUNDERS.forEach((f) => founderUser(f, false));

  // recruiter + mentor demo accounts
  insert<UserData>('users', base({
    email: DEMO.recruiter.email, pw: demoPw, name: 'Neha Kapoor', username: 'neha.kapoor', headline: 'Head of Talent, Nimbus Health',
    company: 'Nimbus Health', roles: ['recruiter'], activeRole: 'recruiter', hue: 160, location: 'Remote (India)', seeded: false,
  }), { id: DEMO.recruiter.id, ref: DEMO.recruiter.email });
  insert<UserData>('users', base({
    email: DEMO.mentor.email, pw: demoPw, name: MENTORS[0].name, username: 'ravi.menon', headline: `${MENTORS[0].title}, ${MENTORS[0].company}`,
    roles: ['mentor'], activeRole: 'mentor', hue: MENTORS[0].hue, mentorId: MENTORS[0].id, seeded: false,
  }), { id: DEMO.mentor.id, ref: DEMO.mentor.email });

  for (const m of MENTORS) insert('mentors', m, { id: m.id });

  for (const j of JOBS) {
    const { id, ...rest } = j;
    insert<JobData>('jobs', { ...rest, status: 'open' }, { id, owner: DEMO.recruiter.id });
  }
  for (const t of TASKS) {
    const { id, submissions, ...rest } = t;
    insert<TaskData>('tasks', { ...rest, status: 'open', baseSubmissions: Math.max(0, submissions - SUBMISSIONS.filter((s) => s.taskId === id).length) }, { id, owner: DEMO.recruiter.id });
  }
  for (const s of SUBMISSIONS) {
    insert<SubmissionData>('submissions', {
      taskId: s.taskId, talentId: s.talentId, link: s.link, text: '', aiScore: s.aiScore,
      recommendation: s.recommendation, meets: s.meets, missing: s.missing, summary: s.summary, status: 'submitted',
    }, { id: s.id, owner: s.talentId, ref: s.taskId });
  }

  // a couple of pre-existing conversations so the inbox is alive
  const t1 = insert<ThreadData>('threads', {
    participants: [DEMO.recruiter.id, DEMO.talent.id], subject: 'Welcome to Nimbus Health', kind: 'direct', lastAt: Date.now() - 3600_000, reads: {},
  });
  insert<MessageData>('messages', { threadId: t1.id, from: DEMO.recruiter.id, text: 'Hi Priya, loved your public profile. Our pricing-page proof task is open and pays ₹2,500. Interested?' }, { ref: t1.id, created: Date.now() - 3600_000 });
}
