import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api, Session, type LinkInfo } from '../../core/api';
import { apiError } from '../../helpers/http';

/**
 * Parooli määramine e-kirja lingiga (/parool?t=…): kutse uuele kasutajale või admini saadetud uue parooli link.
 * Pärast salvestamist on kasutaja sisse logitud ja suunatakse kalkulaatorisse.
 */
@Component({
  selector: 'app-set-password-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressBarModule],
  templateUrl: './set-password-page.html',
  styleUrl: './set-password-page.scss',
})
export class SetPasswordPage {
  private readonly api = inject(Api);
  private readonly session = inject(Session);
  private readonly router = inject(Router);
  private readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('t') ?? '';

  protected readonly info = signal<LinkInfo | null>(null);
  protected readonly loading = signal(true);
  protected readonly invalid = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly show = signal(false);
  protected password = '';
  protected repeat = '';

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      if (!this.token) {
        this.invalid.set('Lingis puudub kood – ava link e-kirjast uuesti.');
        return;
      }
      this.info.set(await this.api.linkInfo(this.token));
    } catch (e) {
      this.invalid.set(apiError(e));
    } finally {
      this.loading.set(false);
    }
  }

  protected async submit(): Promise<void> {
    if (this.password !== this.repeat) {
      this.error.set('Paroolid ei ühti.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.session.setPasswordWithLink(this.token, this.password);
      await this.router.navigateByUrl('/', { replaceUrl: true });
    } catch (e) {
      this.error.set(apiError(e));
    } finally {
      this.busy.set(false);
    }
  }
}
