import { HttpClient, type HttpInterceptorFn } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import type { PriceList } from '@logcalc/calc-engine';
import type { Catalog } from './house-form';
import { firstValueFrom } from 'rxjs';

export type Role = 'superadmin' | 'admin' | 'user';

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  tenant: { id: number; slug: string; name: string };
}

export interface ProjectAccess {
  edit: boolean;
  manage: boolean;
  /** owner = minu maja, shared = minuga jagatud, admin = ettevõtte maja (admini õigusega) */
  via: 'owner' | 'shared' | 'admin';
}

export interface ProjectSummary {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  owner: { id: number; name: string; email: string } | null;
  access: ProjectAccess;
  shareCount: number;
  /** nimekirja jaoks maja andmetest */
  roofType?: 'gable' | 'mono' | null;
  size?: { width: number; depth: number } | null;
}

export interface Share {
  userId: number;
  email: string;
  name: string;
  tenant: string;
  permission: 'view' | 'edit';
  createdAt: string;
}

export interface Project<T = unknown> extends ProjectSummary {
  data: T;
}

export interface TenantSettings {
  prices?: Partial<Record<keyof PriceList, number>>;
  catalog?: Catalog;
  constants?: Partial<TenantConstants>;
}

/** Ettevõtte arvutuse seaded (alamhulk mootori konstantidest) */
export interface TenantConstants {
  defaultRoofOverhang: number;
  roofBoardWidth: number;
  maxJoistSpacing: number;
  maxPurlinSpacing: number;
}

export interface Tenant {
  id: number;
  slug: string;
  name: string;
  settings: TenantSettings;
}

/** CSRF: kõik /api päringud saavad X-Requested-With päise (server nõuab seda muutvatel päringutel). */
export const apiInterceptor: HttpInterceptorFn = (req, next) =>
  req.url.startsWith('/api/') ? next(req.clone({ setHeaders: { 'X-Requested-With': 'logcalc' } })) : next(req);

@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);

  async me(): Promise<User | null> {
    return (await firstValueFrom(this.http.get<{ user: User | null }>('/api/auth/me'))).user;
  }
  async login(email: string, password: string): Promise<User> {
    return (await firstValueFrom(this.http.post<{ user: User }>('/api/auth/login', { email, password }))).user;
  }
  async logout(): Promise<void> {
    await firstValueFrom(this.http.post('/api/auth/logout', {}));
  }
  async changePassword(current: string, next: string): Promise<void> {
    await firstValueFrom(this.http.post('/api/auth/password', { current, new: next }));
  }

  async projects(): Promise<ProjectSummary[]> {
    return (await firstValueFrom(this.http.get<{ projects: ProjectSummary[] }>('/api/projects'))).projects;
  }
  async project<T>(id: number): Promise<Project<T>> {
    return (await firstValueFrom(this.http.get<{ project: Project<T> }>(`/api/projects/${id}`))).project;
  }
  async createProject<T>(name: string, data: T): Promise<Project<T>> {
    return (await firstValueFrom(this.http.post<{ project: Project<T> }>('/api/projects', { name, data }))).project;
  }
  async updateProject<T>(id: number, patch: { name?: string; data?: T }): Promise<Project<T>> {
    return (await firstValueFrom(this.http.put<{ project: Project<T> }>(`/api/projects/${id}`, patch))).project;
  }
  async deleteProject(id: number): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/projects/${id}`));
  }

  async shares(projectId: number): Promise<Share[]> {
    return (await firstValueFrom(this.http.get<{ shares: Share[] }>(`/api/projects/${projectId}/shares`))).shares;
  }
  async addShare(projectId: number, email: string, permission: 'view' | 'edit'): Promise<Share[]> {
    return (await firstValueFrom(this.http.post<{ shares: Share[] }>(`/api/projects/${projectId}/shares`, { email, permission }))).shares;
  }
  async removeShare(projectId: number, userId: number): Promise<Share[]> {
    return (await firstValueFrom(this.http.delete<{ shares: Share[] }>(`/api/projects/${projectId}/shares/${userId}`))).shares;
  }

  async tenant(): Promise<Tenant> {
    return (await firstValueFrom(this.http.get<{ tenant: Tenant }>('/api/tenant'))).tenant;
  }
  async saveTenantSettings(settings: TenantSettings): Promise<Tenant> {
    return (await firstValueFrom(this.http.put<{ tenant: Tenant }>('/api/tenant/settings', settings))).tenant;
  }
}

/** Sisselogitud kasutaja ja tema klient. */
@Injectable({ providedIn: 'root' })
export class Session {
  private readonly api = inject(Api);

  readonly user = signal<User | null>(null);
  readonly tenant = signal<Tenant | null>(null);
  /** true kui /auth/me on vastanud (või serveriga ei saanud ühendust) */
  readonly ready = signal(false);
  readonly isAdmin = computed(() => ['admin', 'superadmin'].includes(this.user()?.role ?? ''));

  async init(): Promise<void> {
    try {
      const u = await this.api.me();
      this.user.set(u);
      if (u) this.tenant.set(await this.api.tenant());
    } catch {
      this.user.set(null);
    } finally {
      this.ready.set(true);
    }
  }

  async login(email: string, password: string): Promise<User> {
    const u = await this.api.login(email, password);
    this.user.set(u);
    this.tenant.set(await this.api.tenant());
    return u;
  }

  async logout(): Promise<void> {
    try {
      await this.api.logout();
    } finally {
      this.user.set(null);
      this.tenant.set(null);
    }
  }
}
