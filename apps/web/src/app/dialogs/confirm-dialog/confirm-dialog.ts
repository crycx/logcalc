import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirm?: string;
  cancel?: string;
  /** Ohtlik tegevus (punane nupp) */
  danger?: boolean;
}

/** Materiali kinnitusaken brauseri confirm() asemel. */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}

/** Avab kinnitusakna; tagastab true, kui kasutaja kinnitas. */
export async function confirmDialog(dialog: MatDialog, data: ConfirmDialogData): Promise<boolean> {
  const ref = dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
    data,
    width: '420px',
    maxWidth: '94vw',
    autoFocus: 'dialog',
    restoreFocus: true,
  });
  return (await firstValueFrom(ref.afterClosed())) === true;
}
