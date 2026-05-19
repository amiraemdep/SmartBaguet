import { HttpClientModule } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { BaguetServiceService } from '../service/baguet-service.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,
    FormsModule,CommonModule,
    HttpClientModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
   codeBaguet = '';
  codePlant = '';
  client = '';
  ot = '';
  item = '';
  ordre = '';

  searchCode = '';

  result: any;

  constructor(private service: BaguetServiceService) {}

  marriage() {

    const data = {
      codeBaguet: this.codeBaguet,
      codePlant: this.codePlant,
      client: this.client,
      ot: this.ot,
      item: this.item,
      ordre: this.ordre
    };

    this.service.marriage(data).subscribe({
      next: (res) => {
        alert(res.message);
      },
      error: (err) => {
        alert(err.error);
      }
    });
  }

  search() {
    this.service.getInfo(this.searchCode).subscribe(res => {
      this.result = res;
    });
  }

  vider() {
    this.service.vider(this.searchCode).subscribe(res => {
      alert(res.message);
    });
  }
}
