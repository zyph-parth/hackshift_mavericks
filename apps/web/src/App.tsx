import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/shell';
import { MarketingLayout } from './components/marketing';
import { queryClient } from './lib/queries';
import { useApp } from './lib/store';

const Landing = lazy(() => import('./pages/Landing'));
const Auth = lazy(() => import('./pages/Auth'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Jobs = lazy(() => import('./pages/Jobs'));
const Applications = lazy(() => import('./pages/Applications'));
const Interview = lazy(() => import('./pages/Interview'));
const Report = lazy(() => import('./pages/Report'));
const Tasks = lazy(() => import('./pages/Tasks').then((m) => ({ default: m.Tasks })));
const NewTask = lazy(() => import('./pages/Tasks').then((m) => ({ default: m.NewTask })));
const TaskDetail = lazy(() => import('./pages/Tasks'));
const Review = lazy(() => import('./pages/Review'));
const Studio = lazy(() => import('./pages/Studio'));
const Cofounders = lazy(() => import('./pages/Cofounders'));
const Mentors = lazy(() => import('./pages/Mentors'));
const Sessions = lazy(() => import('./pages/Sessions'));
const Recruiter = lazy(() => import('./pages/Recruiter'));
const Talent = lazy(() => import('./pages/Talent'));
const Inbox = lazy(() => import('./pages/Inbox'));
const Settings = lazy(() => import('./pages/Settings'));
const Profile = lazy(() => import('./pages/Profile'));
const M = {
  HowItWorks: lazy(() => import('./pages/Marketing').then((m) => ({ default: m.HowItWorks }))),
  Pricing: lazy(() => import('./pages/Marketing').then((m) => ({ default: m.Pricing }))),
  About: lazy(() => import('./pages/Marketing').then((m) => ({ default: m.About }))),
  FAQ: lazy(() => import('./pages/Marketing').then((m) => ({ default: m.FAQPage }))),
  Resources: lazy(() => import('./pages/Marketing').then((m) => ({ default: m.Resources }))),
  Article: lazy(() => import('./pages/Marketing').then((m) => ({ default: m.ArticlePage }))),
  Privacy: lazy(() => import('./pages/Marketing').then((m) => ({ default: () => <m.Legal kind="privacy" /> }))),
  Terms: lazy(() => import('./pages/Marketing').then((m) => ({ default: () => <m.Legal kind="terms" /> }))),
  NotFound: lazy(() => import('./pages/Marketing').then((m) => ({ default: m.NotFound }))),
};

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Splash() {
  return <div className="flex min-h-dvh items-center justify-center bg-bg"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>;
}

function Guard({ children }: { children: ReactNode }) {
  const user = useApp((s) => s.user);
  const booting = useApp((s) => s.booting);
  if (booting) return <Splash />;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export function App() {
  const boot = useApp((s) => s.boot);
  useEffect(() => {
    boot();
  }, [boot]);
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollTop />
        <Suspense fallback={<Splash />}>
          <Routes>
            <Route element={<MarketingLayout />}>
              <Route path="/" element={<Landing />} />
              <Route path="/how-it-works" element={<M.HowItWorks />} />
              <Route path="/pricing" element={<M.Pricing />} />
              <Route path="/about" element={<M.About />} />
              <Route path="/faq" element={<M.FAQ />} />
              <Route path="/resources" element={<M.Resources />} />
              <Route path="/resources/:slug" element={<M.Article />} />
              <Route path="/privacy" element={<M.Privacy />} />
              <Route path="/terms" element={<M.Terms />} />
              <Route path="*" element={<M.NotFound />} />
            </Route>
            <Route path="/login" element={<Auth mode="login" />} />
            <Route path="/signup" element={<Auth mode="signup" />} />
            <Route path="/onboarding" element={<Guard><Onboarding /></Guard>} />
            <Route path="/interview/:id" element={<Guard><Interview /></Guard>} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/applications" element={<Applications />} />
              <Route path="/interview/:id/report" element={<Report />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/tasks/new" element={<NewTask />} />
              <Route path="/tasks/:id" element={<TaskDetail />} />
              <Route path="/tasks/:id/review" element={<Review />} />
              <Route path="/studio" element={<Studio />} />
              <Route path="/studio/cofounders" element={<Cofounders />} />
              <Route path="/mentors" element={<Mentors />} />
              <Route path="/sessions" element={<Sessions />} />
              <Route path="/recruiter" element={<Recruiter />} />
              <Route path="/talent" element={<Talent />} />
              <Route path="/inbox" element={<Inbox />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/u/:username" element={<Profile />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
