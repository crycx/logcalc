import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { InviteInfo } from '../../core/api';
import { serverDate } from '../../helpers/date';

export interface InviteDialogData {
  email: string;
  invite: InviteInfo;
}

/** Parooli lingi tulemus: kas e-kiri läks teele; link kopeerimiseks (kui kiri ei jõua, saab admin selle ise saata). */
@Component({
  selector: 'app-invite-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './invite-dialog.html',
  styleUrl: './invite-dialog.scss',
})
export class InviteDialog {
  protected readonly data = inject<InviteDialogData>(MAT_DIALOG_DATA);
  protected readonly copied = signal(false);
  protected readonly copyFailed = signal(false);
  protected readonly expires = serverDate(this.data.invite.expiresAt);

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.data.invite.url);
      this.copied.set(true);
      this.copyFailed.set(false);
    } catch {
      this.copyFailed.set(true);
    }
  }
}
