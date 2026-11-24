import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Api, type ManagedUser } from '../../core/api';
import { apiError } from '../../helpers/http';
import { generatePassword } from '../../helpers/password';

/** Admin määrab kasutajale uue parooli (juhuslik või käsitsi). */
@Component({
  selector: 'app-password-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatProgressBarModule, MatTooltipModule],
  templateUrl: './password-dialog.html',
  styleUrl: './password-dialog.scss',
})
export class PasswordDialog {
  private readonly api = inject(Api);
  private readonly ref = inject(MatDialogRef<PasswordDialog, boolean>);
  protected readonly user = inject<ManagedUser>(MAT_DIALOG_DATA);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly copied = signal(false);
  protected password = generatePassword();

  protected regenerate(): void {
    this.password = generatePassword();
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
      await this.api.updateUser(this.user.id, { password: this.password });
      this.ref.close(true);
    } catch (e) {
      this.error.set(apiError(e));
    } finally {
      this.busy.set(false);
    }
  }
}
