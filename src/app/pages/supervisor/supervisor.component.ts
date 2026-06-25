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

  // ⚠️ Mets ici l'IP réelle de ton PC (ipconfig → carte Wi-Fi), PAS localhost
  private readonly API = 'https://172.16.37.36:7128/api/baguet';

  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;

  private http   = inject(HttpClient);
  private cdr    = inject(ChangeDetectorRef);
  private router = inject(Router);

  private codeReader = new BrowserMultiFormatReader();
  private scanningPaused = false;

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
  // CAMERA + SCAN (ZXing gère caméra ET décodage en continu)
  // =====================================================

  async startCamera(): Promise<void> {
    this.cameraError.set('');

    try {
      // Liste des caméras disponibles, on préfère celle arrière ("environment")
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
            const code = result.getText();
            console.log('✅ CODE DÉTECTÉ PAR ZXING:', code);
            this.onCodeDetected(code);
          }
          // NotFoundException est normal : ça veut juste dire "rien détecté sur cette frame"
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

  private onCodeDetected(code: string): void {
    if (this.scanning() || this.scanningPaused) return;

    this.scanningPaused = true;

    if ('vibrate' in navigator) navigator.vibrate([50, 30, 50]);

    this.lookupCode(code.trim().toUpperCase());

    // Reprend le scan après 3s (pour scanner un nouveau baguet)
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
}
