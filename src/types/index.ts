import type { User, Organization, Project, ProjectEnvironment, Folder, Secret, Role } from '@prisma/client';

export type { User, Organization, Project, ProjectEnvironment, Folder, Secret, Role };

export interface SecretWithDetails extends Secret {
  folder: Folder;
  environment: ProjectEnvironment;
}

export interface FolderWithChildren extends Folder {
  children: FolderWithChildren[];
  secrets: Secret[];
}

export interface ProjectWithDetails extends Project {
  environments: ProjectEnvironment[];
  folders: FolderWithChildren[];
}

export interface OrganizationWithProjects extends Organization {
  projects: Project[];
}

export interface RoleWithPermissions extends Role {
  permissions: string[];
}

// API Request/Response types
export interface CreateSecretInput {
  key: string;
  value: string;
  envId: string;
  folderId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateSecretInput {
  key?: string;
  value?: string;
  folderId?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateFolderInput {
  name: string;
  envId: string;
  parentId?: string;
}

export interface UpdateFolderInput {
  name?: string;
  parentId?: string;
}

export interface CreateProjectInput {
  name: string;
  slug: string;
  orgId: string;
  environments?: CreateEnvironmentInput[];
}

export interface CreateEnvironmentInput {
  name: string;
  slug: string;
}

export interface CreateOrganizationInput {
  name: string;
  slug: string;
}

export interface InviteMemberInput {
  email: string;
  roleId: string;
}

export interface UpdateMemberRoleInput {
  roleId: string;
}

// UI Types
export interface NavItem {
  title: string;
  href: string;
  icon?: string;
  children?: NavItem[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}
