import { Component, OnInit, signal, inject, computed,OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar, MatSnackBarModule,  } from '@angular/material/snack-bar';
import { MatProgressSpinner, MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { ScannCodeComponent } from '../baguet/scann-code/scann-code.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { BaguetServiceService } from '../../../service/baguet-service.service';
import { Router } from '@angular/router';

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
   tempsExecution: number | null;
  typeAffectation: string | null;
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
private timerInterval: any = null;
now = signal<Date>(new Date());
  constructor(
  private baguetService: BaguetServiceService,private router: Router
) {}
  private http   = inject(HttpClient);
  private fb     = inject(FormBuilder);
  private snack  = inject(MatSnackBar);
  data: any = null;
  scannedCode: string = '';
  //private readonly API = 'http://172.16.37.36:7128/api/baguet';
  private readonly API = '/api/baguet';
  private readonly API2 = '/api/chef';

  //private API2 = 'http://172.16.37.36:7128/api/chef';

  // ── State ────────────────────────────────────────────────────────────
activeTab = signal<'mariage' | 'vider' | 'scan' | 'temps'>('mariage');


loading       = signal(false);


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
 this.timerInterval = setInterval(() => {
    this.now.set(new Date());
  }, 60000);

  this.mariageForm.get('codePlant')?.valueChanges.subscribe(() => {
    this.showClient.set(false);
  });
    // Afficher le champ client si c'est un nouveau plant
    this.mariageForm.get('codePlant')?.valueChanges.subscribe(() => {
      this.showClient.set(false);
    });
  }
// Signal pour le texte de recherche et le filtre statut
searchText = signal('');
filterStatus = signal<'tous' | 'en_cours' | 'vide'>('tous');

// Historique filtré calculé automatiquement
filteredHistory = computed(() => {
  const text = this.searchText().toLowerCase().trim();
  const status = this.filterStatus();

  return this.history().filter(item => {
    // Filtre texte
    const matchText = !text ||
      item.codeBaguet?.toLowerCase().includes(text) ||
      item.codePlant?.toLowerCase().includes(text) ||
      item.client?.toLowerCase().includes(text);

    // Filtre statut
    const matchStatus =
      status === 'tous' ||
      (status === 'en_cours' && !item.dateSortie) ||
      (status === 'vide' && !!item.dateSortie);

    return matchText && matchStatus;
  });
});
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
 ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
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
  this.http.get<HistoryItem[]>(`${this.API}/historytemp`).subscribe({
    next: (data) => this.history.set(data.slice(0, 10)),
    error: () => {}
  });
}
  // ── Utils ─────────────────────────────────────────────────────────────
setTab(tab: 'mariage' | 'vider' | 'scan' | 'temps') {
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

  tempsForm = this.fb.group({
  codePlant: ['', Validators.required],
  tempsExecution: [
    null as number | null,
    [
      Validators.required,
      Validators.min(1)
    ]
  ]
});


// --- Signal réactif qui calcule l'affectation en direct pendant la saisie ---
private tempsValue = toSignal(
  this.tempsForm.get('tempsExecution')!.valueChanges.pipe(startWith(null)),
  { initialValue: null }
);

previewAffectation = computed(() => {
  const t = this.tempsValue();
  if (!t || t <= 0) return null;
  return t <= 20 ? 'Ligne' : 'PlaceFixe';
});

tempsInvalid(): boolean {
  return this.tempsForm.invalid || this.loading();
}
// --- Pré-remplissage si le plan a déjà un temps enregistré ---
loadExistingTemps() {
  const codePlant = this.tempsForm.get('codePlant')?.value;
  if (!codePlant) return;

  this.baguetService.getTempsExecution(codePlant).subscribe({
    next: (res) => {
      if (res?.tempsExecution) {
        this.tempsForm.patchValue({ tempsExecution: res.tempsExecution }, { emitEvent: true });
      }
    },
    error: () => {
      // Plan pas encore enregistré ou sans temps — on ignore silencieusement
    }
  });
}

// --- Soumission ---
onTempsExecution() {
  if (this.tempsForm.invalid) {
    this.tempsForm.markAllAsTouched();
    return;
  }

  this.loading.set(true);
  const { codePlant, tempsExecution } = this.tempsForm.value;

  this.baguetService.setTempsExecution(codePlant!, tempsExecution!).subscribe({
    next: (res) => {
      this.lastResult.set({
        type: 'temps',
        message: res.message,
      success: true,                 // ✅ ajouté

        codePlant: res.codePlant,
        typeAffectation: res.typeAffectation
      });
      this.tempsForm.reset();
      this.loading.set(false);
      this.loadHistory(); // si vous voulez rafraîchir l'historique
    },
    error: (err) => {
      this.loading.set(false);
      this.lastResult.set({
        type: 'temps',
                success: false,                // ✅ ajouté

        message: err?.error?.message ?? "Erreur lors de l'enregistrement du temps.",
        codePlant,
        typeAffectation: null
      });
    }
  });
}

// Calcule le temps écoulé depuis dateEntree
elapsedTime(dateEntree: string): string {
  const start = new Date(dateEntree).getTime();
  const diff = this.now().getTime() - start;

  if (diff < 0) return '0min';

  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

// Détecte si le baguet est en retard (plus de 60 minutes par défaut)
isLate(item: HistoryItem): boolean {
  if (item.dateSortie) return false;
  const start = new Date(item.dateEntree).getTime();
  const diff = this.now().getTime() - start;
  const limit = item.tempsExecution
    ? item.tempsExecution * 60000
    : 60 * 60000; // 60 min par défaut si pas de temps défini
  return diff > limit;
}
// ============================================================
// À AJOUTER 2 : dans votre service (baguet.service.ts)
// ============================================================
setTempsExecution(codePlant: string, tempsExecution: number) {
  return this.http.post<any>(`/api/baguet/temps-execution`, { codePlant, tempsExecution });
}

getTempsExecution(codePlant: string) {
  return this.http.get<any>(`/api/baguet/temps-execution/${codePlant}`);
}
goEmplacement() {
  this.router.navigate(['/ldm-emplacement']);
}
}
