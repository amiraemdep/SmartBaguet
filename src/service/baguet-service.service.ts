import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs'
@Injectable({
  providedIn: 'root'
})
export class BaguetServiceService {

  constructor(private http: HttpClient) {}



  api = 'http://172.16.37.36:7128/api/baguet';


  marriage(data: any): Observable<any> {
    return this.http.post(`${this.api}/marriage`, data);
  }

  getInfo(code: string): Observable<any> {
    return this.http.get(`${this.api}/info/${code}`);
  }

  vider(code: string): Observable<any> {
    return this.http.post(`${this.api}/vider/${code}`, {});
  }
  setTempsExecution(codePlant: string, tempsExecution: number) {
  return this.http.post<{
    codePlant: string;
    tempsExecution: number;
    typeAffectation: 'Ligne' | 'PlaceFixe';
    message: string;
  }>(`${this.api}/Baguet/temps-execution`, { codePlant, tempsExecution });
}
// Cherchez cette méthode et vérifiez l'URL exacte
getHistory() {
  return this.http.get<any[]>(`${this.api}/Baguet/history`); // ⚠️ probablement l'ancienne URL
}
getTempsExecution(codePlant: string) {
  return this.http.get<{
    codePlant: string;
    tempsExecution: number | null;
    typeAffectation: string | null;
  }>(`${this.api}/Baguet/temps-execution/${codePlant}`);
}
}
