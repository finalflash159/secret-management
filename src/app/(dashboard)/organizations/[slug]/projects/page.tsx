import { redirect } from 'next/navigation';

export default function ProjectsRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
  // Redirect to the organization page which shows all projects
  redirect(`/organizations/${params.slug}`);
}
