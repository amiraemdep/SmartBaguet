import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs'
@Injectable({
  providedIn: 'root'
})
export class BaguetServiceService {

  constructor(private http: HttpClient) {}



  api = 'https://localhost:7128/api/baguet';


  marriage(data: any): Observable<any> {
    return this.http.post(`${this.api}/marriage`, data);
  }

  getInfo(code: string): Observable<any> {
    return this.http.get(`${this.api}/info/${code}`);
  }

  vider(code: string): Observable<any> {
    return this.http.post(`${this.api}/vider/${code}`, {});
  }
}
