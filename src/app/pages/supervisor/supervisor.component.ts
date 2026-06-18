import { Component, OnInit, OnDestroy, signal, inject, ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
type Tab = 'scan' | 'dashboard' | 'history' | 'alerts';
import { Html5Qrcode } from 'html5-qrcode';
interface ScanResult {
  type: string;
  codeBaguet?: string;
  codePlant?: string;
  client?: string;
  status?: string;
  dateEntree?: string;
  message?: string;
  ot?: string;
  item?: string;
}

interface ScanResult {
    type: string;
  codeBaguet?: string;
  codePlant?: string;
  client?: string;
  status?: string;
  dateEntree?: string;
  message?: string;
  ot?: string;
  item?: string;
}

interface Stats {
  totalBaguets: number;
  baguetsCharges: number;
  baguetsVides: number;
  plantsAujourdhui: number;
}

interface HistoryItem {
  codeBaguet: string;
  codePlant: string;
  client?: string;
  dateEntree: string;
  dateSortie?: string;
}

interface Alert {
  id: number;
  type: 'error' | 'warning' | 'success';
  message: string;
  time: string;
}

declare var BarcodeDetector: any;
interface HistoryItem {
  codeBaguet: string; codePlant: string;
  client?: string; dateEntree: string; dateSortie?: string;
}

interface Stats {
  totalBaguets: number; baguetsCharges: number;
  baguetsVides: number; plantsAujourdhui: number;
}

@Component({
  selector: 'app-supervisor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './supervisor.component.html',
  styleUrl: './supervisor.component.scss'
})
export class SupervisorComponent implements OnInit, OnDestroy, AfterViewInit {

    @ViewChild('videoEl')
  videoEl!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl')
  canvasEl!: ElementRef<HTMLCanvasElement>;

  private stream: MediaStream | null = null;

  private barcodeDetector: any = null;

  private scanInterval: any = null;
  @ViewChild('canvasEl')
  private http    = inject(HttpClient);
  private fb      = inject(FormBuilder);
  private cdr     = inject(ChangeDetectorRef);
  private router  = inject(Router);
  private destroy$ = new Subject<void>();
 cameraActive = signal(false);

  alerts = signal<Alert[]>([]);

  alertCount = signal(0);
  cameraError = signal('');

  private readonly API = 'http://localhost:5139/api/baguet';

  activeTab   = signal<'scan' | 'dashboard' | 'history'>('scan');
  scanning    = signal(false);
  scanResult  = signal<ScanResult | null>(null);
  stats       = signal<Stats | null>(null);
  history     = signal<HistoryItem[]>([]);
  lastScan    = signal('');
  isOnline    = signal(navigator.onLine);
  manualMode = signal(false);

  scanForm = this.fb.group({
    code: ['', Validators.required]
  });

  ngOnInit() {
    this.loadStats();
    this.loadHistory();
    interval(15000).pipe(takeUntil(this.destroy$))
      .subscribe(() => { this.loadStats(); this.loadHistory(); });
    window.addEventListener('online',  () => { this.isOnline.set(true);  this.cdr.detectChanges(); });
    window.addEventListener('offline', () => { this.isOnline.set(false); this.cdr.detectChanges(); });
  this.loadAll();

    this.startAutoRefresh();

    window.addEventListener('online', () => {
      this.isOnline.set(true);
      this.cdr.detectChanges();
    });

    window.addEventListener('offline', () => {
      this.isOnline.set(false);
      this.cdr.detectChanges();
    });

  }
  ngAfterViewInit(): void {

    setTimeout(() => {
      this.startCamera();
    }, 300);

  }
  ngOnDestroy(): void {

    this.stopCamera();

    this.destroy$.next();

    this.destroy$.complete();

  }

  onScan() {
    if (this.scanForm.invalid) return;
    const code = this.scanForm.value.code!.trim().toUpperCase();
    this.scanning.set(true);
    this.scanResult.set(null);
    if ('vibrate' in navigator) navigator.vibrate(40);

    this.http.get<any>(`${this.API}/info/${code}`).subscribe({
      next: (res) => {
        this.scanning.set(false);
        this.scanResult.set(res);
        this.lastScan.set(new Date().toLocaleTimeString('fr-FR'));
        if ('vibrate' in navigator) navigator.vibrate([40,20,40]);
        this.scanForm.reset();
        this.cdr.detectChanges();
      },
      error: () => {
        this.scanning.set(false);
        this.scanResult.set({ type: 'error', message: `Code "${code}" introuvable` });
        if ('vibrate' in navigator) navigator.vibrate([80,40,80,40,80]);
        this.cdr.detectChanges();
      }
    });
  }





  get taux() {
    const s = this.stats();
    if (!s || !s.totalBaguets) return 0;
    return Math.round((s.baguetsCharges / s.totalBaguets) * 100);
  }


 async startCamera(): Promise<void> {

    try {

      this.cameraError.set('');

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: 'environment'
          },
          width: {
            ideal: 1280
          },
          height: {
            ideal: 720
          }
        },
        audio: false
      });

  if (this.videoEl?.nativeElement) {

  const video = this.videoEl.nativeElement;

  video.srcObject = this.stream;

  video.setAttribute('playsinline', 'true');

  video.muted = true;

  await video.play();

  this.cameraActive.set(true);

  this.cdr.detectChanges();

  this.startBarcodeDetection();
}

    } catch (error) {

      console.error(error);

      this.cameraError.set(
        'Caméra inaccessible — utilisez le mode manuel'
      );

      this.manualMode.set(true);

      this.cameraActive.set(false);

      this.cdr.detectChanges();

    }

  }

  stopCamera(): void {

    if (this.scanInterval) {

      clearInterval(this.scanInterval);

      this.scanInterval = null;

    }

    if (this.stream) {

      this.stream.getTracks().forEach(track => {
        track.stop();
      });

      this.stream = null;

    }

    this.cameraActive.set(false);

  }

  // =====================================================
  // BARCODE
  // =====================================================

  private startBarcodeDetection(): void {

    if ('BarcodeDetector' in window) {

      this.barcodeDetector = new BarcodeDetector({
        formats: [
          'qr_code',
          'code_128',
          'code_39',
          'ean_13',
          'ean_8',
          'data_matrix'
        ]
      });

      this.scanInterval = setInterval(() => {
        this.detectBarcode();
      }, 500);

    } else {

      console.warn('BarcodeDetector non supporté');

      this.manualMode.set(true);

    }

  }

  private async detectBarcode(): Promise<void> {

    if (!this.videoEl?.nativeElement) {
      return;
    }

    if (!this.barcodeDetector) {
      return;
    }

    const video = this.videoEl.nativeElement;

    if (video.readyState !== 4) {
      return;
    }

    try {

      const barcodes =
        await this.barcodeDetector.detect(video);

      if (barcodes.length > 0) {

        const code = barcodes[0].rawValue;

        if (code) {

          this.onCodeDetected(code);

        }

      }

    } catch (error) {

      console.error(error);

    }

  }

  // =====================================================
  // CODE DETECTED
  // =====================================================

  onCodeDetected(code: string): void {

    if (this.scanning()) {
      return;
    }

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }

    const cleanCode = code.trim().toUpperCase();

    if ('vibrate' in navigator) {

      navigator.vibrate([
        50,
        30,
        50
      ]);

    }

    this.lookupCode(cleanCode);

    setTimeout(() => {

      if (this.cameraActive()) {

        this.startBarcodeDetection();

      }

    }, 3000);

  }

  // =====================================================
  // MANUAL
  // =====================================================

  onManualScan(): void {

    if (this.scanForm.invalid) {
      return;
    }

    const code =
      this.scanForm.value.code
        ?.trim()
        .toUpperCase();

    if (!code) {
      return;
    }

    this.lookupCode(code);

    this.scanForm.reset();

  }

  // =====================================================
  // API LOOKUP
  // =====================================================

  private lookupCode(code: string): void {

    this.scanning.set(true);

    this.scanResult.set(null);

    this.http
      .get<any>(`${this.API}/info/${code}`)
      .subscribe({

        next: (response) => {

          this.scanning.set(false);

          this.scanResult.set(response);

          this.lastScan.set(
            new Date().toLocaleTimeString('fr-FR')
          );

          this.cdr.detectChanges();

        },

        error: () => {

          this.scanning.set(false);

          this.scanResult.set({
            type: 'error',
            message: `"${code}" introuvable`
          });

          if ('vibrate' in navigator) {

            navigator.vibrate([
              100,
              50,
              100
            ]);

          }

          this.cdr.detectChanges();

        }

      });

  }

  // =====================================================
  // CLEAR
  // =====================================================

  clearScan(): void {

    this.scanResult.set(null);

    if (this.cameraActive()) {

      this.startBarcodeDetection();

    }

  }

  // =====================================================
  // DATA
  // =====================================================

  loadAll(): void {

    this.loadStats();

    this.loadHistory();

    this.loadAlerts();

  }

  loadStats(): void {

    this.http
      .get<Stats>(`${this.API}/stats`)
      .subscribe({

        next: (data) => {
          this.stats.set(data);
        },

        error: (error) => {
          console.error(error);
        }

      });

  }

  loadHistory(): void {

    this.http
      .get<HistoryItem[]>(`${this.API}/history`)
      .subscribe({

        next: (data) => {

          this.history.set(
            data.slice(0, 30)
          );

        },

        error: (error) => {
          console.error(error);
        }

      });

  }

  loadAlerts(): void {

    this.http
      .get<Alert[]>(`${this.API}/alerts`)
      .subscribe({

        next: (data) => {

          this.alerts.set(data);

          this.alertCount.set(
            data.filter(a => a.type === 'error').length
          );

        },

        error: (error) => {
          console.error(error);
        }

      });

  }

  startAutoRefresh(): void {

    interval(15000)
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe(() => {

        this.loadAll();

      });

  }

  // =====================================================
  // TABS
  // =====================================================


  toggleManual(): void {

    this.manualMode.update(value => !value);

  }

  // =====================================================
  // HELPERS
  // =====================================================

  formatDate(date?: string): string {

    if (!date) {
      return '—';
    }

    return new Date(date)
      .toLocaleString('fr-FR');

  }


  get tauxClass(): string {

    if (this.taux > 80) {
      return 'high';
    }

    if (this.taux > 50) {
      return 'med';
    }

    return 'low';

  }


  goOperator() { this.router.navigate(['/operator']); }
}
