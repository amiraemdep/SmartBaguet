
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators ,FormControl} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

import { debounceTime, distinctUntilChanged } from 'rxjs';
interface PlantInfo {
  codePlant: string;
  client?: string;
  ot?: string;
  codeLdmActuel?: string | null;
}

interface PlantLdmResult {
  codePlant: string;
  codeLdm: string;
  client?: string;
  ot?: string;
  dateAffectation: string;
  message: string;
  success?: boolean;
}

@Component({
  selector: 'app-ldm-emplacement',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ldm-emplacement.component.html',
  styleUrl: './ldm-emplacement.component.css'
})
export class LdmEmplacementComponent {
     private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private apiUrl = '/api/Baguet'; // ⚠️ adaptez à votre base URL (environment.apiUrl)

  ldmForm = this.fb.group({
    codePlant: ['', Validators.required],
    codeLdm: ['', Validators.required]
  });

  searchControl = new FormControl('');

  loading = signal(false);
  plantInfo = signal<PlantInfo | null>(null);
  plantNotFound = signal(false);
  lastResult = signal<PlantLdmResult | null>(null);
  historique = signal<PlantLdmResult[]>([]);

  constructor() {
    this.loadHistorique();

    // Recherche live dans l'historique (débounce pour ne pas spammer l'API)
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.loadHistorique());
  }

  // ── Charge les infos du plant après scan du champ 1 ────────
  loadPlantInfo() {
    const codePlant = this.ldmForm.get('codePlant')?.value;
    if (!codePlant) return;

    this.plantNotFound.set(false);

    this.http.get<PlantInfo>(`${this.apiUrl}/plant-info/${codePlant}`).subscribe({
      next: (res) => {
        this.plantInfo.set(res);
        // Pré-remplit le champ LDM s'il existe déjà, pour permettre une mise à jour facile
        if (res.codeLdmActuel) {
          this.ldmForm.patchValue({ codeLdm: res.codeLdmActuel });
        }
      },
      error: () => {
        this.plantInfo.set(null);
        this.plantNotFound.set(true);
      }
    });
  }

  // ── Historique / recherche magasin ──────────────────────────
  loadHistorique() {
    const search = this.searchControl.value?.trim() || '';
    const params = search ? `?search=${encodeURIComponent(search)}` : '';

    this.http.get<PlantLdmResult[]>(`${this.apiUrl}/history3${params}`).subscribe({
      next: (res) => this.historique.set(res),
      error: () => this.historique.set([])
    });
  }

  // ── Soumission : affecter le LDM au plant ───────────────────
  onAssocier() {
    if (this.ldmForm.invalid) {
      this.ldmForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { codePlant, codeLdm } = this.ldmForm.value;

    this.http.post<PlantLdmResult>(`${this.apiUrl}/associer-plant`, {
      codePlant,
      codeLdm
    }).subscribe({
      next: (res) => {
        this.lastResult.set({ ...res, success: true });
        this.loading.set(false);
        this.ldmForm.reset();
        this.plantInfo.set(null);
        this.loadHistorique();
      },
      error: (err) => {
        this.loading.set(false);
        this.lastResult.set({
          codePlant: codePlant!,
          codeLdm: codeLdm!,
          dateAffectation: '',
          message: err?.error?.message ?? "Erreur lors de l'affectation du LDM.",
          success: false
        });
      }
    });
  }

  formatDate(date: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}
