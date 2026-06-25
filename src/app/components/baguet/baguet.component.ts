import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar, MatSnackBarModule,  } from '@angular/material/snack-bar';
import { MatProgressSpinner, MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { ScannCodeComponent } from '../baguet/scann-code/scann-code.component';
interface MarriageDto {
  codeBaguet: string;
  codePlant: string;
  client?: string;
}

interface HistoryItem {
  codeBaguet: string
  codePlant: string;
  client?: string;
  dateEntree: string;
  dateSortie?: string;
}

@Component({
  selector: 'app-baguet',
  standalone: true,
 imports: [
  CommonModule,
  ScannCodeComponent,
  ReactiveFormsModule,
  MatSnackBarModule,
  ZXingScannerModule,
  MatIcon,
  MatProgressSpinner,
  MatTooltip
],
  templateUrl: './baguet.component.html',
  styleUrl: './baguet.component.scss'
})
export class BaguetComponent implements OnInit {
  private http   = inject(HttpClient);
  private fb     = inject(FormBuilder);
  private snack  = inject(MatSnackBar);
  data: any = null;
  scannedCode: string = '';
  private readonly API = 'https://172.16.37.36:7128/api/baguet';
  private API2 = 'https://172.16.37.36:7128/api/chef';

  // ── State ────────────────────────────────────────────────────────────
activeTab = signal<'mariage' | 'vider' | 'scan'>('mariage');  loading       = signal(false);
  showClient    = signal(false);
  lastResult    = signal<any>(null);
  history       = signal<HistoryItem[]>([]);
  baguetStatus  = signal<'VIDE' | 'CHARGE' | null>(null);

  // ── Forms ─────────────────────────────────────────────────────────────
  mariageForm = this.fb.group({
    codeBaguet: ['', [Validators.required, Validators.minLength(1)]],
    codePlant:  ['', [Validators.required, Validators.minLength(1)]],
    client:     ['']
  });

  viderForm = this.fb.group({
    codePlant: ['', [Validators.required, Validators.minLength(1)]]
  });

  ngOnInit() {
    this.loadHistory();

    // Afficher le champ client si c'est un nouveau plant
    this.mariageForm.get('codePlant')?.valueChanges.subscribe(() => {
      this.showClient.set(false);
    });
  }

  // ── MARIAGE ───────────────────────────────────────────────────────────
  onMariage() {
    if (this.mariageForm.invalid) return;
    this.loading.set(true);

    const dto: MarriageDto = {
      codeBaguet: this.mariageForm.value.codeBaguet!.trim().toUpperCase(),
      codePlant:  this.mariageForm.value.codePlant!.trim().toUpperCase(),
      client:     this.mariageForm.value.client?.trim() || undefined
    };

    this.http.post<any>(`${this.API}/marriage`, dto).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.lastResult.set({ type: 'mariage', ...res });
        this.baguetStatus.set('CHARGE');
        this.snack.open(`✅ ${res.message} — Client: ${res.client || 'N/A'}`, 'OK', {
          duration: 4000,
          panelClass: 'snack-success'
        });
        this.mariageForm.reset();
        this.showClient.set(false);
        this.loadHistory();
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.message || 'Erreur lors du mariage';

        // Si baguet déjà chargé → proposer scan plant directement
        if (msg.includes('déjà utilisé')) {
          this.snack.open(`⚠️ ${msg} — Scannez le plant pour vider`, 'OK', {
            duration: 5000, panelClass: 'snack-warn'
          });
          this.activeTab.set('vider');
        } else {
          this.snack.open(`❌ ${msg}`, 'OK', { duration: 4000, panelClass: 'snack-error' });
        }
      }
    });
  }

  // ── VIDER ─────────────────────────────────────────────────────────────
  onVider() {
    if (this.viderForm.invalid) return;
    this.loading.set(true);

    const codePlant = this.viderForm.value.codePlant!.trim().toUpperCase();

    this.http.post<any>(`${this.API}/vider-par-plant/${codePlant}`, {}).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.lastResult.set({ type: 'vider', ...res });
        this.baguetStatus.set('VIDE');
        this.snack.open(`✅ ${res.message} — Baguet: ${res.codeBaguet}`, 'OK', {
          duration: 4000, panelClass: 'snack-success'
        });
        this.viderForm.reset();
        this.loadHistory();
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.message || 'Erreur lors du vidage';
        this.snack.open(`❌ ${msg}`, 'OK', { duration: 4000, panelClass: 'snack-error' });
      }
    });
  }

  // ── Afficher champ client si nouveau plant ────────────────────────────
  toggleClient() {
    this.showClient.update(v => !v);
  }

  // ── Historique ────────────────────────────────────────────────────────
  loadHistory() {
    this.http.get<HistoryItem[]>(`${this.API}/history`).subscribe({
      next: (data) => this.history.set(data.slice(0, 10)),
      error: () => {} // silencieux si endpoint absent
    });
  }

  // ── Utils ─────────────────────────────────────────────────────────────
  setTab(tab: 'mariage' | 'vider') {
    this.activeTab.set(tab);
    this.lastResult.set(null);
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleString('fr-FR');
  }

  get mariageInvalid() {
    return this.mariageForm.invalid || this.loading();
  }

  get viderInvalid() {
    return this.viderForm.invalid || this.loading();
  }
    onScan(result: string) {
    if (!result) return;

    this.scannedCode = result;

    console.log("🔍 SCANNED:", result);

    this.getDetails(result);
  }

  // 📡 CALL BACKEND
  getDetails(code: string) {
    this.http.get(`${this.API2}/details/${code}`)
      .subscribe({
        next: (res) => {
          this.data = res;
          console.log("✅ DATA:", res);
        },
        error: (err) => {
          console.error("❌ ERROR:", err);
          this.data = null;
        }
      });
  }
}
