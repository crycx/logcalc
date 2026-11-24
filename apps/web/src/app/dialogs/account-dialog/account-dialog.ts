import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { Api, Session, type AuthEvent } from '../../core/api';
import { AUTH_EVENT_INFO, ROLE_LABELS } from '../../helpers/auth-events';
import { serverDate } from '../../helpers/date';
import { apiError } from '../../helpers/http';
import { describeUserAgent } from '../../helpers/user-agent';

/** Minu konto: parooli muutmine ja viimased sisselogimised. */
@Component({
  selector: 'app-account-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatProgressBarModule, MatTabsModule],
  templateUrl: './account-dialog.html',
  styleUrl: './account-dialog.scss',
})
export class AccountDialog {
  private readonly api = inject(Api);
  protected readonly session = inject(Session);
  protected readonly info = AUTH_EVENT_INFO;
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly ua = describeUserAgent;
  protected readonly date = serverDate;

  protected current = '';
  protected next = '';
  protected repeat = '';
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly done = signal(false);

  protected readonly events = signal<AuthEvent[] | null>(null);
  protected readonly eventsError = signal('');

  constructor() {
    this.api.myEvents(20).then(
      (e) => this.events.set(e),
      (e) => this.eventsError.set(apiError(e)),
    );
  }

  async changePassword(): Promise<void> {
    if (this.next !== this.repeat) {
      this.error.set('Uued paroolid ei ühti.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.done.set(false);
    try {
      await this.api.changePassword(this.current, this.next);
      this.current = this.next = this.repeat = '';
      this.done.set(true);
    } catch (e) {
      this.error.set(apiError(e));
    } finally {
      this.busy.set(false);
    }
  }
}
