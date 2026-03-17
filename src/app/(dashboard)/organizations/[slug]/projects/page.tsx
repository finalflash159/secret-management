import { redirect } from 'next/navigation';

export default async function ProjectsRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
  // Redirect to the organization page which shows all projects
  const { slug } = await params;
  redirect(`/organizations/${slug}`);
}
