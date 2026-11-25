import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Api, Session, type AuthEvent, type AuthEventFilter, type ManagedUser, type Role, type TenantSummary } from '../../core/api';
import { AccountDialog } from '../../dialogs/account-dialog/account-dialog';
import { confirmDialog } from '../../dialogs/confirm-dialog/confirm-dialog';
import { PasswordDialog } from '../../dialogs/password-dialog/password-dialog';
import { InviteDialog, type InviteDialogData } from '../../dialogs/invite-dialog/invite-dialog';
import { NameDialog, type NameDialogData } from '../../dialogs/name-dialog/name-dialog';
import { UserDialog, type UserDialogData, type UserDialogResult } from '../../dialogs/user-dialog/user-dialog';
import { AUTH_EVENT_INFO, ROLE_LABELS } from '../../helpers/auth-events';
import { serverDate } from '../../helpers/date';
import { apiError } from '../../helpers/http';
import { describeUserAgent } from '../../helpers/user-agent';

const PAGE = 100;

/** Kasutajate haldus ja sisselogimiste logi (admin / superadmin). */
@Component({
  selector: 'app-users-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './users-page.html',
  styleUrl: './users-page.scss',
})
export class UsersPage {
  private readonly api = inject(Api);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly router = inject(Router);
  protected readonly session = inject(Session);

  protected readonly info = AUTH_EVENT_INFO;
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly ua = describeUserAgent;
  protected readonly date = serverDate;

  protected readonly tab = signal(0);

  // ------------------------------------------------------------ kasutajad
  protected readonly users = signal<ManagedUser[]>([]);
  protected readonly usersLoading = signal(true);
  protected readonly usersError = signal('');
  protected readonly search = signal('');
  protected readonly showInactive = signal(true);
  private tenants: TenantSummary[] = [];

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.users().filter(
      (u) =>
        (this.showInactive() || u.active) &&
        (!q || u.name.toLowerCase().includes(q) || u.email.includes(q) || u.tenant.name.toLowerCase().includes(q)),
    );
  });
  protected readonly activeCount = computed(() => this.users().filter((u) => u.active).length);
  /** superadmin näeb mitut ettevõtet -> ettevõtte veerg */
  protected readonly multiTenant = computed(() => new Set(this.users().map((u) => u.tenant.id)).size > 1 || this.session.isSuperadmin());

  // ------------------------------------------------------------ logi
  protected readonly events = signal<AuthEvent[]>([]);
  protected readonly eventsMore = signal(false);
  protected readonly eventsLoading = signal(false);
  protected readonly eventsError = signal('');
  protected readonly eventType = signal<AuthEventFilter>('');
  protected readonly eventUser = signal<number | null>(null);

  constructor() {
    void this.loadUsers();
    void this.loadEvents();
    if (this.session.isSuperadmin()) {
      this.api.tenants().then(
        (t) => (this.tenants = t),
        () => undefined,
      );
    }
  }

  protected async loadUsers(): Promise<void> {
    this.usersLoading.set(true);
    this.usersError.set('');
    try {
      this.users.set(await this.api.users());
    } catch (e) {
      this.usersError.set(apiError(e));
    } finally {
      this.usersLoading.set(false);
    }
  }

  protected async loadEvents(more = false): Promise<void> {
    this.eventsLoading.set(true);
    this.eventsError.set('');
    try {
      const before = more ? this.events().at(-1)?.id : undefined;
      const r = await this.api.authEvents({ type: this.eventType(), userId: this.eventUser(), limit: PAGE, ...(before ? { before } : {}) });
      this.events.set(more ? [...this.events(), ...r.events] : r.events);
      this.eventsMore.set(r.more);
    } catch (e) {
      this.eventsError.set(apiError(e));
    } finally {
      this.eventsLoading.set(false);
    }
  }

  protected setEventType(t: AuthEventFilter): void {
    this.eventType.set(t);
    void this.loadEvents();
  }

  protected setEventUser(id: number | null): void {
    this.eventUser.set(id);
    void this.loadEvents();
  }

  /** Rollid, mida praegune kasutaja tohib anda */
  private roles(): Role[] {
    return this.session.isSuperadmin() ? ['user', 'admin', 'superadmin'] : ['user', 'admin'];
  }

  protected isMe(u: ManagedUser): boolean {
    return u.id === this.session.user()?.id;
  }

  /** Admin ei saa muuta superadmini */
  protected canManage(u: ManagedUser): boolean {
    return u.role !== 'superadmin' || this.session.isSuperadmin();
  }

  private replace(u: ManagedUser): void {
    this.users.update((list) => list.map((x) => (x.id === u.id ? u : x)));
  }

  /**
   * Uus ettevõte (superadmin): oma hinnad, kataloog ja kasutajad; ettevõte tuleb kasutaja järgi (alamdomeeni pole
   * vaja). Kohe järel esimese kasutaja (admin) lisamine sellesse ettevõttesse.
   */
  protected async addCompany(): Promise<void> {
    const name = await firstValueFrom(
      this.dialog.open<NameDialog, NameDialogData, string>(NameDialog, { data: { title: 'Uus ettevõte', name: '', action: 'Lisa ettevõte' }, width: '420px' }).afterClosed(),
    );
    if (!name) return;
    const base = slugify(name) || 'ettevote';
    try {
      let tenant = null;
      for (let i = 1; !tenant && i <= 20; i++) {
        try {
          tenant = await this.api.createTenant(name, i === 1 ? base : `${base}-${i}`);
        } catch (e) {
          // sama lühinimi olemas -> järgmine number
          if (!(e instanceof HttpErrorResponse && e.status === 409)) throw e;
        }
      }
      if (!tenant) throw new Error('Lühinime ei leitud.');
      this.tenants = [...this.tenants, { id: tenant.id, slug: tenant.slug, name: tenant.name, users: 0 }];
      this.snack.open(`Ettevõte „${tenant.name}“ on lisatud. Lisa sellele esimene kasutaja (admin).`, undefined, { duration: 4000 });
      await this.addUser(tenant.id);
    } catch (e) {
      this.snack.open(apiError(e), 'OK', { duration: 6000 });
    }
  }

  protected async addUser(tenantId?: number): Promise<void> {
    const data: UserDialogData = {
      roles: this.roles(),
      ...(this.session.isSuperadmin() && this.tenants.length > 1 ? { tenants: this.tenants, defaultTenantId: tenantId ?? this.session.user()?.tenant.id } : {}),
      ...(tenantId ? { defaultRole: 'admin' as Role } : {}),
    };
    const r: UserDialogResult | undefined = await firstValueFrom(this.dialog.open(UserDialog, { data, width: '520px', maxWidth: '94vw' }).afterClosed());
    if (!r) return;
    const u = r.user;
    this.users.update((list) => [...list, u].sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email, 'et')));
    if (r.invite) this.showInvite(u.email, r.invite);
    else this.snack.open(`Kasutaja ${u.email} on lisatud. Anna algne parool talle turvaliselt edasi.`, 'OK', { duration: 6000 });
    void this.loadEvents();
  }

  /** Parooli link e-postiga (kutse, kui parool määramata; muidu uue parooli link). Eelmine link kaotab kehtivuse. */
  protected async sendLink(u: ManagedUser): Promise<void> {
    try {
      const r = await this.api.sendPasswordLink(u.id);
      this.replace(r.user);
      this.showInvite(u.email, r.invite);
      void this.loadEvents();
    } catch (e) {
      this.snack.open(apiError(e), 'OK', { duration: 6000 });
    }
  }

  private showInvite(email: string, invite: InviteDialogData['invite']): void {
    this.dialog.open(InviteDialog, { data: { email, invite } satisfies InviteDialogData, width: '520px', maxWidth: '94vw' });
  }

  protected async edit(u: ManagedUser): Promise<void> {
    const roles = this.isMe(u) ? [u.role] : this.roles();
    const r: UserDialogResult | undefined = await firstValueFrom(this.dialog.open(UserDialog, { data: { user: u, roles }, width: '520px', maxWidth: '94vw' }).afterClosed());
    if (!r) return;
    this.replace(r.user);
    this.snack.open('Salvestatud.', undefined, { duration: 2500 });
    void this.loadEvents();
  }

  protected async resetPassword(u: ManagedUser): Promise<void> {
    const ok = await firstValueFrom(this.dialog.open(PasswordDialog, { data: u, width: '460px', maxWidth: '94vw' }).afterClosed());
    if (!ok) return;
    this.snack.open(`Uus parool on määratud: ${u.email}`, undefined, { duration: 3500 });
    void this.loadEvents();
  }

  protected async toggleActive(u: ManagedUser): Promise<void> {
    if (u.active) {
      const ok = await confirmDialog(this.dialog, {
        title: 'Lülita kasutaja välja?',
        message: `${u.name || u.email} ei saa enam sisse logida ja tema avatud seanss lõpeb kohe. Tema majad jäävad alles. Saad ta hiljem uuesti aktiveerida.`,
        confirm: 'Lülita välja',
        danger: true,
      });
      if (!ok) return;
    }
    try {
      this.replace(await this.api.updateUser(u.id, { active: !u.active }));
      this.snack.open(u.active ? 'Kasutaja on välja lülitatud.' : 'Kasutaja on aktiveeritud.', undefined, { duration: 2500 });
      void this.loadEvents();
    } catch (e) {
      this.snack.open(apiError(e), 'OK', { duration: 5000 });
    }
  }

  protected showLog(u: ManagedUser): void {
    this.eventUser.set(u.id);
    this.eventType.set('');
    this.tab.set(1);
    void this.loadEvents();
  }

  /** Sündmuse lisainfo: põhjus/muudatus ja kes tegi (kui mitte kasutaja ise) */
  protected eventDetail(e: AuthEvent): string {
    const by = e.actor && e.actor.id !== e.user?.id ? `tegi ${e.actor.name || e.actor.email}` : '';
    return [e.detail, by].filter(Boolean).join(' · ');
  }

  protected userLabel(id: number | null): string {
    const u = this.users().find((x) => x.id === id);
    return u ? u.name || u.email : '';
  }

  protected openAccount(): void {
    this.dialog.open(AccountDialog, { width: '560px', maxWidth: '94vw', autoFocus: 'dialog' });
  }

  protected async logout(): Promise<void> {
    await this.session.logout();
    await this.router.navigateByUrl('/');
    this.snack.open('Oled välja logitud.', undefined, { duration: 2500 });
  }
}

/** Ettevõtte nimest lühinimi (a-z, 0-9, sidekriips): „Sinpal OÜ“ -> „sinpal-ou“ */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}
