import { Component ,inject} from '@angular/core';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {  OnInit, OnDestroy, signal, ChangeDetectorRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
type Tab = 'scan' | 'dashboard' | 'history' | 'alerts';
interface ScanResult {
  type: string;
  codeBaguet?: string;
  codePlant?: string;
  client?: string;
  status?: string;
  dateEntree?: string;
  dateSortie?: string;
  message?: string;
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
@Component({
  selector: 'app-scann-code',
  standalone: true,
  imports: [  CommonModule,
    ZXingScannerModule,ReactiveFormsModule],
  templateUrl: './scann-code.component.html',
  styleUrl: './scann-code.component.css'
})
export class ScannCodeComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private fb       = inject(FormBuilder);
  private cdr      = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  //private readonly API = 'http://localhost:7128/api/baguet';
  private readonly API = '/api/baguet';

  // ── State ──────────────────────────────────────────────────────
  activeTab   = signal<Tab>('dashboard');
  scanning    = signal(false);
  scanResult  = signal<ScanResult | null>(null);
  stats       = signal<Stats | null>(null);
  history     = signal<HistoryItem[]>([]);
  alerts      = signal<Alert[]>([]);
  alertCount  = signal(0);
  lastScan    = signal('');
  isOnline    = signal(navigator.onLine);

  scanForm = this.fb.group({ code: ['', Validators.required] });
  data: any = null;
  scannedCode: string = '';

  // 📸 QR / CODE BAR SCAN


  // 📡 CALL BACKEND
  getDetails(code: string) {
    this.http.get(`${this.API}/details/${code}`)
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



  ngOnInit() {
    this.loadAll();
    this.startAutoRefresh();
    window.addEventListener('online',  () => this.isOnline.set(true));
    window.addEventListener('offline', () => this.isOnline.set(false));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── SCAN ───────────────────────────────────────────────────────
  onScan() {
    if (this.scanForm.invalid) return;
    const code = this.scanForm.value.code!.trim().toUpperCase();
    this.scanning.set(true);
    this.scanResult.set(null);
    if ('vibrate' in navigator) navigator.vibrate(50);

    this.http.get<any>(`${this.API}/info/${code}`).subscribe({
      next: (res) => {
        this.scanning.set(false);
        this.scanResult.set(res);
        this.lastScan.set(new Date().toLocaleTimeString('fr-FR'));
        if ('vibrate' in navigator) navigator.vibrate([50, 30, 50]);
        this.scanForm.reset();
        this.cdr.detectChanges();
      },
      error: () => {
        this.scanning.set(false);
        this.scanResult.set({ type: 'error', message: `"${code}" introuvable` });
        if ('vibrate' in navigator) navigator.vibrate([100, 50, 100, 50, 100]);
        this.cdr.detectChanges();
      }
    });
  }

  clearScan() {
    this.scanResult.set(null);
    setTimeout(() => (document.querySelector('.scan-input') as HTMLInputElement)?.focus(), 100);
  }

  // ── DATA ───────────────────────────────────────────────────────
  loadAll() {
    this.loadStats();
    this.loadHistory();
    this.loadAlerts();
  }

  loadStats() {
    this.http.get<Stats>(`${this.API}/stats`).subscribe({
      next: s => this.stats.set(s),
      error: () => {}
    });
  }

  loadHistory() {
    this.http.get<HistoryItem[]>(`${this.API}/history`).subscribe({
      next: d => this.history.set(d.slice(0, 30)),
      error: () => {}
    });
  }

  loadAlerts() {
    this.http.get<Alert[]>(`${this.API}/alerts`).subscribe({
      next: a => {
        this.alerts.set(a);
        this.alertCount.set(a.filter(x => x.type === 'error').length);
      },
      error: () => {}
    });
  }

  startAutoRefresh() {
    interval(15000).pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadAll());
  }

  // ── UTILS ──────────────────────────────────────────────────────
  setTab(t: Tab) {
    this.activeTab.set(t);
    if (t === 'dashboard') this.loadStats();
    if (t === 'history')   this.loadHistory();
    if (t === 'alerts')    this.loadAlerts();
  }

  formatDate(d?: string) {
    if (!d) return '—';
    return new Date(d).toLocaleString('fr-FR');
  }

  get taux() {
    const s = this.stats();
    if (!s || !s.totalBaguets) return 0;
    return Math.round((s.baguetsCharges / s.totalBaguets) * 100);
  }

  get tauxClass() {
    return this.taux > 80 ? 'high' : this.taux > 50 ? 'med' : 'low';
  }
}
