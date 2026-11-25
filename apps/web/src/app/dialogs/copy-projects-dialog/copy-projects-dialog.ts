import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Api, type ManagedUser, type ProjectSummary } from '../../core/api';
import { serverDate } from '../../helpers/date';
import { apiError } from '../../helpers/http';

export interface CopyProjectsDialogData {
  user: ManagedUser;
}

/**
 * Majade kopeerimine kasutajale: valitud majadest tekivad talle sõltumatud koopiad (tema omad, tema ettevõttes).
 * Tulemus: kopeeritud majade arv.
 */
@Component({
  selector: 'app-copy-projects-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule, MatDialogModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressBarModule],
  templateUrl: './copy-projects-dialog.html',
  styleUrl: './copy-projects-dialog.scss',
})
export class CopyProjectsDialog {
  private readonly api = inject(Api);
  private readonly ref = inject(MatDialogRef<CopyProjectsDialog, number>);
  protected readonly data = inject<CopyProjectsDialogData>(MAT_DIALOG_DATA);
  protected readonly date = serverDate;

  protected readonly projects = signal<ProjectSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly search = signal('');
  protected readonly selected = signal<ReadonlySet<number>>(new Set());

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    // sihtkasutaja enda majad nimekirjast välja (neid pole mõtet talle kopeerida)
    return this.projects().filter((p) => p.owner?.id !== this.data.user.id && (!q || p.name.toLowerCase().includes(q)));
  });
  protected readonly allSelected = computed(() => this.filtered().length > 0 && this.filtered().every((p) => this.selected().has(p.id)));
  protected readonly someSelected = computed(() => this.filtered().some((p) => this.selected().has(p.id)) && !this.allSelected());

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.projects.set(await this.api.projects());
    } catch (e) {
      this.error.set(apiError(e));
    } finally {
      this.loading.set(false);
    }
  }

  protected toggle(id: number, on: boolean): void {
    const s = new Set(this.selected());
    if (on) s.add(id);
    else s.delete(id);
    this.selected.set(s);
  }

  protected toggleAll(on: boolean): void {
    const s = new Set(this.selected());
    for (const p of this.filtered()) {
      if (on) s.add(p.id);
      else s.delete(p.id);
    }
    this.selected.set(s);
  }

  async submit(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      const n = await this.api.copyProjects(this.data.user.id, [...this.selected()]);
      this.ref.close(n);
    } catch (e) {
      this.error.set(apiError(e));
    } finally {
      this.busy.set(false);
    }
  }
}
