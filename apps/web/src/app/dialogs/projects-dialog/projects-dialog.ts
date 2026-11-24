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
import { Api, type ProjectSummary } from '../../core/api';
import { serverDate } from '../../helpers/date';
import { apiError } from '../../helpers/http';
import { ShareDialog } from '../share-dialog/share-dialog';

/* ---------------------------------------------------------------- Majade nimekiri */
interface ProjectGroup {
  title: string;
  items: ProjectSummary[];
}

@Component({
  selector: 'app-projects-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatProgressBarModule, MatTooltipModule],
  templateUrl: './projects-dialog.html',
  styleUrl: './projects-dialog.scss',
})
export class ProjectsDialog {
  private readonly api = inject(Api);
  private readonly dialog = inject(MatDialog);
  private readonly ref = inject(MatDialogRef<ProjectsDialog, number>);
  protected readonly items = signal<ProjectSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly confirmId = signal<number | null>(null);
  protected query = '';
  protected readonly date = serverDate;

  constructor() {
    void this.load();
  }

  protected groups(): ProjectGroup[] {
    const q = this.query.trim().toLowerCase();
    const list = q ? this.items().filter((p) => p.name.toLowerCase().includes(q)) : this.items();
    return [
      { title: 'Minu majad', items: list.filter((p) => p.access.via === 'owner') },
      { title: 'Minuga jagatud', items: list.filter((p) => p.access.via === 'shared') },
      { title: 'Ettevõtte majad', items: list.filter((p) => p.access.via === 'admin') },
    ].filter((g) => g.items.length > 0);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.items.set(await this.api.projects());
    } catch (e) {
      this.error.set(apiError(e));
    } finally {
      this.loading.set(false);
    }
  }

  protected open(p: ProjectSummary): void {
    this.ref.close(p.id);
  }

  protected share(p: ProjectSummary): void {
    this.dialog
      .open(ShareDialog, { data: { id: p.id, name: p.name }, width: '600px', maxWidth: '94vw', autoFocus: 'first-tabbable' })
      .afterClosed()
      .subscribe(() => void this.load());
  }

  protected async remove(p: ProjectSummary): Promise<void> {
    try {
      await this.api.deleteProject(p.id);
      this.items.update((list) => list.filter((x) => x.id !== p.id));
    } catch (e) {
      this.error.set(apiError(e));
    }
    this.confirmId.set(null);
  }
}
