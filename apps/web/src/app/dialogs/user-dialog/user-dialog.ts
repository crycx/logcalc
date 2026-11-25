import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Api, type InviteInfo, type ManagedUser, type Role, type TenantSummary } from '../../core/api';
import { ROLE_LABELS } from '../../helpers/auth-events';
import { apiError } from '../../helpers/http';
import { generatePassword } from '../../helpers/password';

export interface UserDialogData {
  /** puudub = uus kasutaja */
  user?: ManagedUser;
  /** rollid, mida praegune kasutaja tohib anda */
  roles: Role[];
  /** superadmin: kliendid, kuhu kasutaja luua */
  tenants?: TenantSummary[];
  defaultTenantId?: number;
  /** uue kasutaja vaikimisi roll (uue ettevõtte esimene kasutaja: admin) */
  defaultRole?: Role;
}

/** Dialoogi tulemus: salvestatud kasutaja; uuel kutsega kasutajal ka link */
export interface UserDialogResult {
  user: ManagedUser;
  invite?: InviteInfo;
}

/** Kasutaja lisamine (e-post, nimi, roll; parooli link e-postiga või algne parool) või muutmine (nimi, roll). */
@Component({
  selector: 'app-user-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './user-dialog.html',
  styleUrl: './user-dialog.scss',
})
export class UserDialog {
  private readonly api = inject(Api);
  private readonly ref = inject(MatDialogRef<UserDialog, UserDialogResult>);
  protected readonly data = inject<UserDialogData>(MAT_DIALOG_DATA);
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly isNew = !this.data.user;
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly showPassword = signal(true);
  protected readonly copied = signal(false);

  protected email = this.data.user?.email ?? '';
  protected name = this.data.user?.name ?? '';
  protected role: Role = this.data.user?.role ?? this.data.defaultRole ?? 'user';
  protected tenantId = this.data.user?.tenant.id ?? this.data.defaultTenantId ?? this.data.tenants?.[0]?.id ?? 0;
  protected password = this.isNew ? generatePassword() : '';
  /** uus kasutaja: 'link' – e-postiga link parooli määramiseks (vaikimisi), 'password' – admin annab algse parooli */
  protected mode: 'link' | 'password' = 'link';

  protected regenerate(): void {
    this.password = generatePassword();
    this.showPassword.set(true);
    this.copied.set(false);
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.password);
      this.copied.set(true);
    } catch {
      this.error.set('Lõikelauale kopeerimine ei õnnestunud – vali parool ja kopeeri käsitsi.');
    }
  }

  async submit(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      const u = this.data.user;
      const result: UserDialogResult = u
        ? { user: await this.api.updateUser(u.id, { name: this.name.trim(), ...(this.role !== u.role ? { role: this.role } : {}) }) }
        : await this.api.createUser({
            email: this.email.trim(),
            name: this.name.trim(),
            role: this.role,
            ...(this.mode === 'link' ? { invite: true } : { password: this.password }),
            ...(this.data.tenants?.length ? { tenantId: this.tenantId } : {}),
          });
      this.ref.close(result);
    } catch (e) {
      this.error.set(apiError(e));
    } finally {
      this.busy.set(false);
    }
  }
}
