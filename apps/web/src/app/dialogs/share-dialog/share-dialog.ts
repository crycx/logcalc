import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Api, type Share } from '../../core/api';
import { apiError } from '../../helpers/http';

/* ---------------------------------------------------------------- Jagamine */
export interface ShareDialogData {
  id: number;
  name: string;
}

@Component({
  selector: 'app-share-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressBarModule, MatTooltipModule],
  templateUrl: './share-dialog.html',
  styleUrl: './share-dialog.scss',
})
export class ShareDialog {
  private readonly api = inject(Api);
  protected readonly data = inject<ShareDialogData>(MAT_DIALOG_DATA);
  protected readonly shares = signal<Share[]>([]);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected email = '';
  protected permission: 'view' | 'edit' = 'view';

  constructor() {
    void this.run(() => this.api.shares(this.data.id));
  }

  private async run(op: () => Promise<Share[]>): Promise<boolean> {
    this.busy.set(true);
    this.error.set('');
    try {
      this.shares.set(await op());
      return true;
    } catch (e) {
      this.error.set(apiError(e));
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  protected async add(): Promise<void> {
    if (await this.run(() => this.api.addShare(this.data.id, this.email.trim(), this.permission))) this.email = '';
  }

  protected change(s: Share, permission: 'view' | 'edit'): void {
    void this.run(() => this.api.addShare(this.data.id, s.email, permission));
  }

  protected remove(s: Share): void {
    void this.run(() => this.api.removeShare(this.data.id, s.userId));
  }
}
