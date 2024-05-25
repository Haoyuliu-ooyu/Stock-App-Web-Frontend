import { Component } from '@angular/core';
import { OnInit } from '@angular/core';
import { DetailsService } from '../details.service';
import { MongodbService } from '../mongodb.service';
import { forkJoin, map } from 'rxjs'
import { NgIf, NgFor, NgClass } from '@angular/common';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import { Router } from '@angular/router';

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, MatProgressSpinnerModule], 
  templateUrl: './watchlist.component.html',
  styleUrl: './watchlist.component.css'
})
export class WatchlistComponent implements OnInit {

  watchlists:any[] = [];
  empty:boolean = false;
  isLoading:boolean = true;

  constructor(private detailService:DetailsService, private mongoDbService:MongodbService, private router:Router) {}

  ngOnInit(): void {
    this.mongoDbService.getWatchlistsTickers().subscribe(res=>{
      this.watchlists = res;
      this.empty = res.length === 0;
      this.isLoading = true;
      const quoteRequests = this.watchlists.map(watchlist => 
        this.detailService.getQuote(watchlist.ticker)
      );

      if (quoteRequests.length > 0) {
        forkJoin(quoteRequests).pipe(
          map(quotes => {
            return quotes.map((quote, index) => {
              return {
                ...this.watchlists[index],
                c: this.formatNum(quote.c),
                d: this.formatNum(quote.d),
                dp: this.formatNum(quote.dp),
                positive: quote.d >= 0
              };
            });
          })
        ).subscribe(enhancedWatchlists => {
          this.watchlists = enhancedWatchlists;
          this.isLoading = false;
        });
      } else {
        this.isLoading = false;
      }
    })

  }

  closeCard(ticker:string, index:number) {
    const removedTicker = this.watchlists.splice(index, 1)[0];
    this.mongoDbService.deleteWatchlistTicker(ticker).subscribe({
      
      next: (response) => {
        // Handle the response
        console.log('Ticker deleted:', response);
        // this.ngOnInit();
      },
      error: (error) => {
        // Handle the error
        console.error('Error deleting ticker:', error);
        this.watchlists.splice(index, 0, removedTicker);
      }
    });
    
  }

  clickCard(ticker:string) {
    this.router.navigateByUrl(`/search/${ticker}`);
  }

  formatNum(num:string):string{
    return Number(num).toFixed(2);
  }

  }

  
