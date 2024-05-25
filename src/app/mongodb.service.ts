import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MongodbService {

  // private watchlistUrl = 'http://localhost:3000/api/watchlist';
  // private portfolioUrl = 'http://localhost:3000/api/portfolio';
  // private balanceUrl = 'http://localhost:3000/api/balance';

  private watchlistUrl = 'https://haoyuliu-csci571-hw3.wl.r.appspot.com/api/watchlist';
  private portfolioUrl = 'https://haoyuliu-csci571-hw3.wl.r.appspot.com/api/portfolio';
  private balanceUrl = 'https://haoyuliu-csci571-hw3.wl.r.appspot.com/api/balance';

  constructor(private http: HttpClient) { }

  getWatchlistsTickers(): Observable<any[]> {
    return this.http.get<any[]>(this.watchlistUrl);
  }

  addWatchlistTicker(tickerData: any): Observable<any> {
    return this.http.post<any>(this.watchlistUrl, tickerData);
  }

  deleteWatchlistTicker(ticker: string): Observable<any> {
    return this.http.delete<any>(`${this.watchlistUrl}/${ticker}`);
  }

  getBalance(): Observable<any[]> {
    return this.http.get<any[]>(this.balanceUrl);
  }

  updateBalance(balanceValue:number):Observable<any[]> {
    return this.http.post<any>(this.balanceUrl, {balance: balanceValue})
  }

  getPortfolioTIckers(): Observable<any[]> {
    return this.http.get<any[]>(this.portfolioUrl);
  }

  addPortfolioTicker(tickerData: any): Observable<any> {
    return this.http.post<any>(this.portfolioUrl, tickerData);
  }

  deletePortfolioTicker(ticker: string): Observable<any> {
    return this.http.delete<any>(`${this.portfolioUrl}/${ticker}`);
  }
}
