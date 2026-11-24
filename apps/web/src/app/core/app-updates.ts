import { ApplicationRef, Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SwUpdate, type VersionReadyEvent } from '@angular/service-worker';
import { filter, first, interval } from 'rxjs';

const CHECK_EVERY_MS = 10 * 60 * 1000;

/**
 * Uue versiooni teavitus (service worker).
 * Kui serverisse on laaditud uus versioon, näidatakse teadet „Uus versioon on saadaval“ nupuga „Uuenda“.
 * Lehte ei laeta ise uuesti, et pooleli olev töö ei kaoks.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdates {
  private readonly sw = inject(SwUpdate);
  private readonly snack = inject(MatSnackBar);
  private readonly appRef = inject(ApplicationRef);
  private shown = false;

  start(): void {
    if (!this.sw.isEnabled) return;

    this.sw.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(() => this.notify());

    this.sw.unrecoverable.subscribe(() => {
      this.snack
        .open('Rakendus vajab uuesti laadimist.', 'Lae uuesti')
        .onAction()
        .subscribe(() => document.location.reload());
    });

    // kontroll: kui rakendus on stabiilne, seejärel iga 10 min ja vahekaardile naastes
    this.appRef.isStable.pipe(first((s) => s)).subscribe(() => void this.check());
    interval(CHECK_EVERY_MS).subscribe(() => void this.check());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.check();
    });
  }

  private async check(): Promise<void> {
    try {
      await this.sw.checkForUpdate();
    } catch {
      /* võrguviga – proovime hiljem uuesti */
    }
  }

  private notify(): void {
    if (this.shown) return;
    this.shown = true;
    this.snack
      .open('Uus versioon on saadaval.', 'Uuenda')
      .onAction()
      .subscribe(async () => {
        try {
          await this.sw.activateUpdate();
        } finally {
          document.location.reload();
        }
      });
  }
}
