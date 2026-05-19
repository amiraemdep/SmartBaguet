import { Component ,inject} from '@angular/core';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
@Component({
  selector: 'app-scann-code',
  standalone: true,
  imports: [  CommonModule,
    ZXingScannerModule],
  templateUrl: './scann-code.component.html',
  styleUrl: './scann-code.component.css'
})
export class ScannCodeComponent {
  private http = inject(HttpClient);
  private API = 'http://localhost:5000/api/chef';

  data: any = null;
  scannedCode: string = '';

  // 📸 QR / CODE BAR SCAN
  onScan(result: string) {
    if (!result) return;

    this.scannedCode = result;

    console.log("🔍 SCANNED:", result);

    this.getDetails(result);
  }

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
}
