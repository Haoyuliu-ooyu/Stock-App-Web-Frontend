import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { shareReplay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DetailsService {
  // private BASE_URL = 'http://localhost:3000/api';
  private BASE_URL = 'https://haoyuliu-csci571-hw3.wl.r.appspot.com/api';

  private tickerSubject = new BehaviorSubject<any>('home');
  ticker$: Observable<any> = this.tickerSubject.asObservable();

  private profileSubject = new BehaviorSubject<any>({});
  profile$: Observable<any> = this.profileSubject.asObservable();

  private quoteSubject = new BehaviorSubject<any>({});
  quote$: Observable<any> = this.quoteSubject.asObservable();

  private peersSubject = new BehaviorSubject<any>({});
  peers$: Observable<any> = this.peersSubject.asObservable();

  private hourlySubject = new BehaviorSubject<any>({});
  hourly$: Observable<any> = this.hourlySubject.asObservable();

  private historySubject = new BehaviorSubject<any>({});
  history$: Observable<any> = this.historySubject.asObservable();

  private newsSubject = new BehaviorSubject<any>({});
  news$: Observable<any> = this.newsSubject.asObservable();

  private insiderSubject = new BehaviorSubject<any>({});
  insider$: Observable<any> = this.insiderSubject.asObservable();

  private recoSubject = new BehaviorSubject<any>({});
  reco$: Observable<any> = this.recoSubject.asObservable();

  private earningSubject = new BehaviorSubject<any>({});
  earning$: Observable<any> = this.earningSubject.asObservable();

  private autocompleteSubject = new BehaviorSubject<any>({});
  autocomplete$: Observable<any> = this.autocompleteSubject.asObservable();

  private cache = new Map<string, { data: any; timestamp: number }>();

  constructor(private http: HttpClient) {}

  private fetchAndCache(endpoint: string, subject: BehaviorSubject<any>, cacheKey: string): Observable<any> {
    const cacheEntry = this.cache.get(cacheKey);
    const now = new Date().getTime();
  
    if (cacheEntry && (now - cacheEntry.timestamp < 120000)) {
      return of(cacheEntry.data);
    } else {
      const request$ = this.http.get<any>(`${this.BASE_URL}/${endpoint}`).pipe(
        tap(data => {
          this.cache.set(cacheKey, { data, timestamp: now });
          subject.next(data);
        }),
        shareReplay(1)
      );
      
      request$.subscribe();
      return request$;
    }
  }

  getCache():any {
    return this.cache;
  }

  getProfile(ticker: string): Observable<any> {
    return this.fetchAndCache(`profile/${ticker}`, this.profileSubject, `profile-${ticker}`);
  }

  getQuoteCached(ticker: string): Observable<any> {
    return this.fetchAndCache(`quote/${ticker}`, this.quoteSubject, `quote-${ticker}`);
  }

  getQuote(ticker:string): Observable<any> {
    return this.http.get<any>(`${this.BASE_URL}/quote/${ticker}`)
  }

  getPeers(ticker: string): Observable<any> {
    return this.fetchAndCache(`peers/${ticker}`, this.peersSubject, `peers-${ticker}`);
  }

  getHourly(ticker: string, from: string, to: string): Observable<any> {
    return this.fetchAndCache(`hourly/${ticker}/${from}/${to}`, this.hourlySubject, `hourly-${ticker}-${from}-${to}`);
  }

  getHistory(ticker: string): Observable<any> {
    return this.fetchAndCache(`history/${ticker}`, this.historySubject, `history-${ticker}`);
  }

  getNews(ticker: string): Observable<any> {
    return this.fetchAndCache(`news/${ticker}`, this.newsSubject, `news-${ticker}`);
  }
  
  getInsider(ticker: string): Observable<any> {
    return this.fetchAndCache(`insider-sentiment/${ticker}`, this.insiderSubject, `insider-${ticker}`);
  }

  getReco(ticker: string): Observable<any> {
    return this.fetchAndCache(`recommendation-trends/${ticker}`, this.recoSubject, `reco-${ticker}`);
  }

  getEarning(ticker: string): Observable<any> {
    return this.fetchAndCache(`earning/${ticker}`, this.earningSubject, `earning-${ticker}`);
  }


  getAutoComplete(ticker: string): Observable<any> {
    return this.http.get<any>(`${this.BASE_URL}/autocomplete/${ticker}`);
    
  }

  clearCache(): void {
    this.cache.clear();
  }

  // Helper method to update the current ticker; doesn't fetch data by itself
  setTicker(ticker: string): void {
    // this.cache.clear(); // Optional: clear cache when ticker changes to ensure fresh data
    // this.profileSubject.next(null); // Reset data on ticker change
    // this.quoteSubject.next(null);
    // this.peersSubject.next(null);
    // this.hourlySubject.next(null);
    // this.historySubject.next(null);
    // this.newsSubject.next(null);
    // this.insiderSubject.next(null);
    this.tickerSubject.next(ticker);
  }

  getCurrentTicker(): string {
    return this.tickerSubject.getValue();
  }
}
