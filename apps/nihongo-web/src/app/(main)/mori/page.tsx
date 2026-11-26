import { notFound } from 'next/navigation';
import MoriCourseView from '@/views/MoriCourseView';
import { isMoriCourseAvailable } from '@/server/moriCourseAvailability';

export default async function MoriPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  if (!await isMoriCourseAvailable()) notFound();
  const params = await searchParams;
  return <MoriCourseView initialLevel={params.level} />;
}
