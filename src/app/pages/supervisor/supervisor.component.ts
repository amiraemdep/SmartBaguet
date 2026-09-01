import {
  Component, signal, inject, ChangeDetectorRef,
  ViewChild, ElementRef, AfterViewInit, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface BaguetResult {
  type: 'success' | 'vide' | 'warning' | 'error';
  codeBaguet?: string;
  codePlant?: string;
  client?: string;
  ot?: string;
  item?: string;
  ordre?: string;
  typeContrepartie?: string;
  status?: string;
  message?: string;
}

@Component({
  selector: 'app-supervisor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './supervisor.component.html',
  styleUrl: './supervisor.component.scss'
})
export class SupervisorComponent implements AfterViewInit, OnDestroy {

  private readonly API = '/api/baguet';

  // ✅ Format attendu du code baguet : exactement 8 chiffres.
  // Ajuste cette regex si ton format réel est différent (ex: lettres autorisées).
  private readonly CODE_BAGUET_REGEX = /^\d{8}$/;

  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;

  private http   = inject(HttpClient);
  private cdr    = inject(ChangeDetectorRef);
  private router = inject(Router);

  private codeReader = new BrowserMultiFormatReader();
  private scanningPaused = false;

  // (double-confirmation désactivée temporairement pour diagnostic — voir handleRawCode)

  scanning      = signal(false);
  result        = signal<BaguetResult | null>(null);
  lastSearch    = signal('');
  cameraActive  = signal(false);
  cameraError   = signal('');

  // =====================================================
  // LIFECYCLE
  // =====================================================

  ngAfterViewInit(): void {
    setTimeout(() => this.startCamera(), 300);
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  // =====================================================
  // CAMERA + SCAN
  // =====================================================

  async startCamera(): Promise<void> {
    this.cameraError.set('');

    try {
      const devices = await this.codeReader.listVideoInputDevices();
      const backCamera = devices.find(d =>
        /back|rear|environment/i.test(d.label)
      ) || devices[devices.length - 1];

      const deviceId = backCamera ? backCamera.deviceId : undefined;

      await this.codeReader.decodeFromVideoDevice(
        deviceId ?? null,
        this.videoEl.nativeElement,
        (result, err) => {
          if (this.scanningPaused) return;

          if (result) {
            const code = result.getText().trim().toUpperCase();
            console.log('📷 Lecture brute ZXing:', code);
            this.handleRawCode(code);
          }
          if (err && !(err instanceof NotFoundException)) {
            console.error('Erreur scan:', err);
          }
        }
      );

      console.log('✅ Caméra et scanner ZXing démarrés avec succès');
      this.cameraActive.set(true);
      this.cdr.detectChanges();

    } catch (error) {
      console.error('Erreur startCamera:', error);
      this.cameraError.set('Caméra inaccessible — vérifiez les permissions et HTTPS');
      this.cameraActive.set(false);
      this.cdr.detectChanges();
    }
  }

  stopCamera(): void {
    this.codeReader.reset();
    this.cameraActive.set(false);
  }

  // =====================================================
  // VALIDATION + DOUBLE CONFIRMATION
  // =====================================================

  /**
   * Reçoit chaque lecture brute de ZXing et déclenche la recherche API
   * si le code respecte le format attendu (8 chiffres).
   * (La double-confirmation a été retirée temporairement — trop stricte,
   * elle empêchait tout résultat de s'afficher. À réintroduire plus tard
   * si besoin, avec une fenêtre plus large.)
   */
  private handleRawCode(code: string): void {
    if (!this.CODE_BAGUET_REGEX.test(code)) {
      console.warn('⚠️ Code rejeté (format invalide) :', code);
      return;
    }
    this.onCodeConfirmed(code);
  }

  private onCodeConfirmed(code: string): void {
    if (this.scanning() || this.scanningPaused) return;

    this.scanningPaused = true;

    if ('vibrate' in navigator) navigator.vibrate([50, 30, 50]);

    this.lookupCode(code);

    setTimeout(() => {
      this.scanningPaused = false;
    }, 3000);
  }

  // =====================================================
  // API LOOKUP
  // =====================================================

  private lookupCode(code: string): void {
    this.scanning.set(true);
    this.result.set(null);
    this.http.get<any>(`${this.API}/by-baguet/${code}`).subscribe({
      next: (response) => {
        this.scanning.set(false);
        this.result.set(response);
        this.lastSearch.set(new Date().toLocaleTimeString('fr-FR'));
        if ('vibrate' in navigator) navigator.vibrate([40, 20, 40]);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.scanning.set(false);
        const msg = err.status === 0
          ? 'Connexion au serveur impossible — vérifiez réseau / HTTPS / CORS'
          : `Baguet "${code}" introuvable`;
        this.result.set({ type: 'error', message: msg });
        if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
        this.cdr.detectChanges();
      }
    });
  }

  clearResult(): void {
    this.result.set(null);
    this.scanningPaused = false;
  }

  goOperator(): void {
    this.router.navigate(['/operator']);
  }
  goEmplacement() {
  this.router.navigate(['/ldm-emplacement']);
}
}
