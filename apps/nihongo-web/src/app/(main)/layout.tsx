import AppLayout from '@/components/AppLayout';
import { isMoriCourseAvailable } from '@/server/moriCourseAvailability';

export const dynamic = 'force-dynamic';

export default async function MainGroupLayout({ children }: { children: React.ReactNode }) {
  const showMoriCourse = await isMoriCourseAvailable();
  return <AppLayout showMoriCourse={showMoriCourse}>{children}</AppLayout>;
}
