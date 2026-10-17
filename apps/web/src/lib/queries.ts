import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, post, patchApi, put, ApiError } from './api';
import type {
  ApplicationRow, CofounderRow, InterviewResultT, JobRow, MentorT, MessageT, NoticeT, PublicUser, SubmissionT, TaskT, ThreadRow,
} from './api';
import { useApp } from './store';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      retry: (n, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && n < 2,
      refetchOnWindowFocus: true,
    },
  },
});

const enabled = () => !!useApp.getState().user;

export const useJobs = () => useQuery({ queryKey: ['jobs'], queryFn: () => api<{ jobs: JobRow[] }>('/jobs').then((d) => d.jobs) });
export const useMyJobs = () => useQuery({ queryKey: ['jobs', 'mine'], queryFn: () => api<{ jobs: JobRow[] }>('/jobs/mine').then((d) => d.jobs) });
export const useJobApplicants = (id?: string) =>
  useQuery({ queryKey: ['jobs', id, 'applications'], enabled: !!id, queryFn: () => api<{ applications: (ApplicationRow & { talent: PublicUser })[] }>(`/jobs/${id}/applications`).then((d) => d.applications) });
export const useApplications = () => useQuery({ queryKey: ['applications'], queryFn: () => api<{ applications: ApplicationRow[] }>('/applications/mine').then((d) => d.applications) });

export const useTasks = () => useQuery({ queryKey: ['tasks'], queryFn: () => api<{ tasks: TaskT[] }>('/tasks').then((d) => d.tasks) });
export const useMyTasks = (on = true) => useQuery({ queryKey: ['tasks', 'mine'], enabled: on, queryFn: () => api<{ tasks: TaskT[] }>('/tasks/mine').then((d) => d.tasks) });
export const useTask = (id?: string) => useQuery({ queryKey: ['task', id], enabled: !!id, queryFn: () => api<{ task: TaskT }>(`/tasks/${id}`).then((d) => d.task) });
export const useSubmissions = (id?: string) =>
  useQuery({ queryKey: ['task', id, 'submissions'], enabled: !!id, queryFn: () => api<{ task: TaskT; submissions: SubmissionT[] }>(`/tasks/${id}/submissions`) });

export const useMentors = () => useQuery({ queryKey: ['mentors'], queryFn: () => api<{ mentors: MentorT[] }>('/mentors').then((d) => d.mentors) });
export interface BookingRow {
  id: string; mentorId: string; slot: string; goal: string; price: number; link: string;
  mentor?: { id: string; name: string; hue: number; title: string }; mentee?: PublicUser;
}
export const useBookings = () => useQuery({ queryKey: ['bookings'], queryFn: () => api<{ bookings: BookingRow[] }>('/bookings/mine').then((d) => d.bookings) });

export const useCofounders = () => useQuery({ queryKey: ['cofounders'], queryFn: () => api<{ matches: CofounderRow[] }>('/cofounders').then((d) => d.matches) });
export interface VentureT { id: string; text: string; analysis: null | import('@launchloop/shared').IdeaAnalysis; facts: import('@launchloop/shared').StartupFacts; teamSize: number; hasUsers: boolean; done: Record<string, boolean> }
export const useVenture = () => useQuery({ queryKey: ['venture'], queryFn: () => api<{ venture: VentureT | null }>('/venture').then((d) => d.venture) });

export const useThreads = () => useQuery({ queryKey: ['threads'], enabled: enabled(), refetchInterval: 6000, queryFn: () => api<{ threads: ThreadRow[]; unread: number }>('/threads') });
export const useThread = (id?: string) =>
  useQuery({ queryKey: ['thread', id], enabled: !!id, refetchInterval: 4000, queryFn: () => api<{ thread: ThreadRow; messages: MessageT[] }>(`/threads/${id}`) });
export const useNotices = () => useQuery({ queryKey: ['notices'], enabled: enabled(), refetchInterval: 10_000, queryFn: () => api<{ notices: NoticeT[]; unread: number }>('/notices') });
export const useLatestInterview = () => useQuery({ queryKey: ['interview', 'latest'], queryFn: () => api<{ interview: (InterviewResultT & { created: number }) | null; attempts: number }>('/interview/latest') });
export const useStats = () => useQuery({ queryKey: ['stats'], queryFn: () => api<{ talents: number; startups: number; tasksPaid: number; mentorHours: number; openJobs: number }>('/stats') });

/** Call after any mutation that changes the user's evidence so everything re-ranks. */
export function useRefreshMe() {
  const qc = useQueryClient();
  return async () => {
    const d = await api<{ user: import('./api').Me }>('/me');
    useApp.getState().setUser(d.user);
    await qc.invalidateQueries();
  };
}

export function useAction<TIn, TOut>(fn: (input: TIn) => Promise<TOut>, opts: { success?: string | ((o: TOut) => string); invalidate?: unknown[][]; onDone?: (o: TOut) => void } = {}) {
  const qc = useQueryClient();
  const toast = useApp.getState().toast;
  return useMutation({
    mutationFn: fn,
    onSuccess: (o) => {
      opts.invalidate?.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      if (opts.success) toast({ title: typeof opts.success === 'function' ? opts.success(o) : opts.success, tone: 'good' });
      opts.onDone?.(o);
    },
    onError: (e) => toast({ title: e instanceof ApiError ? e.message : 'Something went wrong.', tone: 'warn' }),
  });
}

export { api, post, patchApi, put };
export const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
