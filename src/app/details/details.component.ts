import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject, TemplateRef } from '@angular/core';
import { DetailsService } from '../details.service';
import { Router, ActivatedRoute } from '@angular/router';
import { Renderer2 } from '@angular/core';
import { ThisReceiver } from '@angular/compiler';
import { NgClass, NgIf } from '@angular/common';
import {MatTabsModule} from '@angular/material/tabs';
import * as Highcharts from 'highcharts/highstock';
import { HighchartsChartModule } from 'highcharts-angular';
import { RouterLink } from '@angular/router';
import { NgFor } from '@angular/common';
import indicatorsAll from 'highcharts/indicators/indicators-all';
import { ModalDismissReasons, NgbDatepickerModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { switchMap, take } from 'rxjs/operators';
import { __param } from 'tslib';
import { forkJoin, Subscription, timer } from 'rxjs';
import { HostListener } from '@angular/core';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import { MongodbService } from '../mongodb.service';
import { FormsModule, FormControl, ReactiveFormsModule } from '@angular/forms'; 



@Component({
  selector: 'app-details',
  standalone: true,
  imports: [NgClass, NgIf, MatTabsModule, HighchartsChartModule, RouterLink, NgFor, MatProgressSpinnerModule, FormsModule, ReactiveFormsModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.css'
})
export class DetailsComponent implements OnInit {

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(e: Event) {
    this.ngOnDestroy();
  }

  ticker:any;
  //mongoDb Part
  watching:boolean = true;
  addedToWatchlist:boolean = false;
  removedFromWatchlist:boolean = false;

  owning:boolean = true;
  boughtSuccessfully = false;
  soldSuccessfully = false;
  portfolio:any[] = [];
  balance:number = 0;
  modalItem:any = {};
  itemIndex:any = -1;
  modalQuantity = new FormControl(0);
  modalTotal:number = 0;
  errorBuy:boolean = false;
  errorSell:boolean = false;

  //api data part
  profileData:any = {};
  quoteData:any = {};
  peersData:any = [];
  positive:boolean = false;
  marketText:string = '';
  newsData:any = [];
  insiderData:any=[];


  HighchartsHourly: typeof Highcharts = Highcharts;
  chartOptionsHourly!: Highcharts.Options;

  HighchartsHistory: typeof Highcharts = Highcharts;
  chartOptionsHistory!: Highcharts.Options;

  HighchartsReco: typeof Highcharts = Highcharts;
  chartOptionsReco!: Highcharts.Options;

  HighchartsEarning: typeof Highcharts = Highcharts;
  chartOptionsEarning!: Highcharts.Options;


  loaded:boolean = true;
  showSpinner:boolean = false;
  error:boolean = false;
  notFound:boolean = false;
  errorMsg:string = '';

  selectedNews:any = {}
  private modalService = inject(NgbModal);
  openNews(content:any, newsItem: any) {
    this.selectedNews = newsItem;
    this.selectedNews.fb = 'https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(newsItem.url)+'&amp;src=sdkpreparse';
		this.modalService.open(content);
	}

  private quoteSubscription!: Subscription;

  constructor(private detailService: DetailsService,
              private mongoDbService: MongodbService,
              private router: Router,
              private renderer: Renderer2,
              private activedRoute: ActivatedRoute) {}


  async ngOnInit() {
    this.activedRoute.paramMap.subscribe(params=>{
      // this.resetData();
      const serviceTicker = this.detailService.getCurrentTicker();
      const urlTicker = params.get('ticker')!;
      console.log(serviceTicker, urlTicker)
      if (serviceTicker !== urlTicker) {
        console.log('new')
        this.resetData();
      } else  {
        console.log('cached')
        this.loaded = false;
      }
      this.ticker = urlTicker;
      // this.initializeData()

      this.detailService.getProfile(this.ticker).subscribe(profile=>{
        if (Object.keys(profile).length === 0) {
          this.loaded = false;
          this.error = false;
          this.notFound = true;
        } else {
          this.ticker = profile.ticker;
          this.profileData = profile;
          
          this.initializeData();
        }
      })
    })

    this.modalQuantity.valueChanges.subscribe(value=> {
      if (value != null) {
        this.modalTotal = Number((value*(this.quoteData.c)).toFixed(2));
        this.errorBuy = this.modalTotal > this.balance || value < 0;
        if (this.modalItem){
          this.errorSell = (value > this.modalItem.quantity || value < 0);
        }
      } else {
        this.modalTotal = 0;
        this.errorBuy = false;
        this.errorSell = false;
      }
    })
  }

  initializeData():void{
          //finnhub+polygon
          const today = new Date();
          const yesterday = new Date(today);yesterday.setDate(yesterday.getDate() - 1);
          const lastClosed = this.lastClosedDate();
          const dayBefore = this.getOneDayBefore(lastClosed);
          
          forkJoin({
            profile: this.detailService.getProfile(this.ticker),
            quote: this.detailService.getQuoteCached(this.ticker),
            peers: this.detailService.getPeers(this.ticker),
            news: this.detailService.getNews(this.ticker),
            hourly: this.marketOpen()?this.detailService.getHourly(this.ticker,this.formatDate(yesterday),this.formatDate(today)):this.detailService.getHourly(this.ticker,dayBefore,lastClosed),
            history: this.detailService.getHistory(this.ticker),
            insider: this.detailService.getInsider(this.ticker),
            reco: this.detailService.getReco(this.ticker),
            earning: this.detailService.getEarning(this.ticker),
            watchlist: this.mongoDbService.getWatchlistsTickers(),
            balance: this.mongoDbService.getBalance(),
            portfolio: this.mongoDbService.getPortfolioTIckers(),
          }).subscribe({
            next: ({ profile, quote, peers, history, news, hourly, insider, reco, earning, watchlist, balance, portfolio }) => {
              //api part
              //profile
              if (Object.keys(profile).length === 0) {
                this.loaded = false;
                this.error = false;
                this.notFound = true;
                return;
              } 
              this.profileData=profile;
              this.ticker = profile.ticker;
              

              //quote
              if (this.marketOpen()){
                this.updateQuoteEvery(15000);
              } else {
                this.positive = quote.d>=0;
                this.quoteData.c = this.formatNum(quote.c);
                this.quoteData.d = this.formatNum(quote.d);
                this.quoteData.dp = this.formatNum(quote.dp);
                this.quoteData.t = this.formatTimestamp(quote.t)
                this.quoteData.h = this.formatNum(quote.h);
                this.quoteData.l = this.formatNum(quote.l);
                this.quoteData.o = this.formatNum(quote.o);
                this.quoteData.pc = this.formatNum(quote.pc);
              }
              const closeTime:string = this.lastCloseTime();
              this.marketText =  this.marketOpen() ? 'Market Oepn':`Market Closed on ${closeTime}`;
              //peers
              this.peersData = peers;
              //hourly
              this.setHourlyData(hourly);
              //news
              this.setNews(news);
              //hitory
              this.setHistory(history);
              //insider
              this.setInsiderData(insider);
              //reco
              this.setReco(reco);
              //earning
              this.setEarning(earning);

              

              //mongodb part
              this.watching = watchlist.map(item=>item.ticker).includes(this.ticker);
              this.balance = Number(Number(balance).toFixed(2));
              this.portfolio = portfolio.map(item=>item.ticker);
              this.owning = this.portfolio.includes(this.ticker);
              this.modalItem = portfolio.find(item => item.ticker === this.ticker);


              //show
              this.showSpinner = false;
              this.error = false;
              this.loaded = true;
              this.notFound = false;
              this.detailService.setTicker(profile.ticker)
            },
            error: async (error) => {
              this.errorMsg = error.status;
              this.error = true;
              this.loaded = false;
              this.notFound = false;
              // await this.delay(5000);
              // this.router.navigateByUrl('/search/home')
            }
          });
  }
  

  async delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

  ngOnDestroy() {
    if (this.quoteSubscription) {
      this.quoteSubscription.unsubscribe();
    }
  }

  updateQuoteEvery(interval: number) {
    const ticker = this.ticker; // Capture the current ticker value
    this.quoteSubscription = timer(0, interval).pipe(
      switchMap(() => this.detailService.getQuote(ticker))
    ).subscribe(quote => {
      this.positive = quote.d>=0;
      this.quoteData.c = this.formatNum(quote.c);
      this.quoteData.d = this.formatNum(quote.d);
      this.quoteData.dp = this.formatNum(quote.dp);
      this.quoteData.t = this.formatTimestamp(quote.t)
      this.quoteData.h = this.formatNum(quote.h);
      this.quoteData.l = this.formatNum(quote.l);
      this.quoteData.o = this.formatNum(quote.o);
      this.quoteData.pc = this.formatNum(quote.pc);
    });
  }

  setReco(res:any) {
    this.chartOptionsReco = {
      chart: {
        type: 'column'
      },
      title: {
        text: 'Recommendation Trends',
      },
      xAxis: {
        categories: [res[0].period, res[1].period, res[2].period, res[3].period]
      },
      yAxis: {
        min: 0,
        title: {
          text: '#Analysis'
        },
        stackLabels: {
          enabled: true
        }
      },
      plotOptions: {
        column: {
          stacking: 'normal',
          dataLabels: {
            enabled: true
          }
        }
      },
      series: [{
        type:'column',
        name: 'Strong Buy',
        data: [res[0].strongBuy, res[1].strongBuy, res[2].strongBuy, res[3].strongBuy],
        color: '#195f31',
      }, {
        type:'column',
        name: 'Buy',
        data: [res[0].buy, res[1].buy, res[2].buy, res[3].buy],
        color: '#25af50',
      }, {
        type:'column',
        name: 'Hold',
        data: [res[0].hold, res[1].hold, res[2].hold, res[3].hold],
        color: '#b07d27',
      },{
        type:'column',
        name: 'Sell',
        data: [res[0].sell, res[1].sell, res[2].sell, res[3].sell],
        color: '#f05050',
      },{
        type:'column',
        name: 'Strong Sell',
        data: [res[0].strongSell, res[1].strongSell, res[2].strongSell, res[3].strongSell],
        color: '#732828',
      }]
    }
  }

  setEarning(data:any) {
    const actualSeriesData = data.map((item:any) => (item.actual));
    
    const estimateSeriesData = data.map((item:any) => (item.estimate));

    const categories = data.map((item:any) => `${item.period}<br>Surprise: ${item.surprise}`);

    this.chartOptionsEarning = {
      title: {
        text: 'Historical EPS Surprises'
      },
      xAxis: {
        categories: categories,
      },
      yAxis: {
        title: {
          text: 'Quarterly EPS'
        }
      },
      tooltip: {
      },
      plotOptions: {
        spline: {
          marker: {
            enabled: true
          }
        }
      },
      series: [{
        type: 'spline',
        name: 'Actual',
        data: actualSeriesData,
        color: 'lightblue',
      }, {
        type: 'spline',
        name: 'Estimate',
        data: estimateSeriesData,
        color: 'blue',
      }]
    }

  }

  setInsiderData(res:any) {
    let totalMSPR = 0, posMSPR = 0, negMSPR = 0, totalChange = 0, posChange = 0, negChange = 0; 
    for (let i = 0; i < res.data.length; i++) {
      totalMSPR += res.data[i].mspr;
      totalChange += res.data[i].change;
      if (res.data[i].change >= 0) {
        posChange += res.data[i].change;
      } else {
        negChange += res.data[i].change;
      }

      if (res.data[i].mspr >= 0) {
        posMSPR += res.data[i].mspr;
      } else {
        negMSPR += res.data[i].mspr;
      }
    }
    this.insiderData = {'totalMSPR': totalMSPR.toFixed(2), 'posMSPR': posMSPR.toFixed(2), 'negMSPR': negMSPR.toFixed(2), 'totalChange': totalChange.toFixed(2), 'posChange': posChange.toFixed(2), 'negChange': negChange.toFixed(2)};
  }

  setHourlyData(res:any) {
    const chartTitle = this.ticker+' Stock Price'
      const chartColor = this.positive?'green':'red';
      var chartData = []
      for (let i = 0; i < res.results.length; i++) {
        chartData.push([
          res.results[i].t,
          res.results[i].c
        ])
      }
      this.chartOptionsHourly = {
        chart: {
          backgroundColor: '#f0f0f0', // Light gray background
        },
        rangeSelector: {
          selected: 1
        },
        title: {
          text: chartTitle
        },
        xAxis: {
          type: 'datetime',
        },
        series: [{
          name: this.ticker,
          type: 'line',
          color: chartColor,
          data: chartData,
          tooltip: {
            valueDecimals: 2
          },
          marker: {
            enabled: false // Disable markers
          }
        }],
        yAxis: {
          opposite:true
        }
      };
  }

  setNews(res:any) {
    const news = [];
    let i = 0;
    while (news.length < 20 && i < res.length) {
      if (res[i].image != '' && res[i].headline != '' && res[i].datetime != '' && res[i].url != '') {
        news.push(res[i]);
      }
      i+=1;
    }
    this.newsData = news;
  }
  resetData(): void{
    this.loaded = false;
    this.showSpinner = true;
    this.error = false;
    this.notFound = false;
    this.profileData = {};
    this.quoteData = {};
    this.peersData = [];
    this.positive = false;
    this.marketText = '';
    this.newsData = [];
    this.insiderData=[];

    this.chartOptionsEarning = {};
    this.chartOptionsHistory = {};
    this.chartOptionsHourly = {};
    this.chartOptionsReco = {};
  }

  setHistory(res:any){
    indicatorsAll(Highcharts)
    const data= res.results
      const chartTitle = this.ticker+' Historical'
      const ohlc = [],
      volume = [],
      dataLength = data.length,
      // set the allowed units for data grouping
      groupingUnits: [string, number[]][] = [
        ['week', [1]], 
        ['month', [1, 2, 3, 4, 6]]
      ];
      
      for (let i = 0; i < dataLength; i += 1) {
        ohlc.push([
            data[i].t, // the date
            data[i].o, // open
            data[i].h, // high
            data[i].l, // low
            data[i].c // close
        ]);

        volume.push([
            data[i].t, // the date
            data[i].v // the volume
        ]);
      }

    this.chartOptionsHistory = {

      rangeSelector: {
          selected: 2
      },

      title: {
          text: chartTitle
      },

      subtitle: {
          text: 'With SMA and Volume by Price technical indicators'
      },

      yAxis: [{
          startOnTick: false,
          endOnTick: false,
          labels: {
              align: 'right',
              x: -3
          },
          title: {
              text: 'OHLC'
          },
          height: '60%',
          lineWidth: 2,
          resize: {
              enabled: true
          }
      }, {
          labels: {
              align: 'right',
              x: -3
          },
          title: {
              text: 'Volume'
          },
          top: '65%',
          height: '35%',
          offset: 0,
          lineWidth: 2
      }],

      tooltip: {
          split: true
      },

      plotOptions: {
          series: {
              dataGrouping: {
                  units: groupingUnits
              }
          }
      },

      series: [{
          type: 'candlestick',
          name: 'AAPL',
          id: 'aapl',
          zIndex: 2,
          data: ohlc
      }, {
          type: 'column',
          name: 'Volume',
          id: 'volume',
          data: volume,
          yAxis: 1
      }, {
          type: 'vbp',
          linkedTo: 'aapl',
          params: {
              volumeSeriesID: 'volume'
          },
          dataLabels: {
              enabled: false
          },
          zoneLines: {
              enabled: false
          }
      }, {
          type: 'sma',
          linkedTo: 'aapl',
          zIndex: 1,
          marker: {
              enabled: false
          }
      }]
    }
  }

  navigateToPeer(ticker: string, event: MouseEvent): void {
    event.preventDefault();
    this.router.navigateByUrl(`/search/${ticker}`);
  }

  formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0'); // Add leading zero if needed
      const day = String(date.getDate()).padStart(2, '0'); // Add leading zero if needed
      return `${year}-${month}-${day}`;
  };

  formatDateModal = (timestamp: number): string => {
    const formattedDate = new Date(timestamp*1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'PST' // Adjust timezone as needed
    });
    return formattedDate;
  }
  
  formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp*1000);
    
    // Get individual components of the date
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-based
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
  
    // Construct the formatted string
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  //generated by chatgpt
  marketOpen():boolean {
    const now = new Date(); // Current date and time
    const dayOfWeek = now.getDay(); // Day of the week, where 0 is Sunday and 6 is Saturday

    // Check if today is a weekday (Monday=1, ..., Friday=5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const startOfWorkday = new Date(); // Today's date but at the start of the workday
        const endOfWorkday = new Date(); // Today's date but at the end of the workday

        // Set the start of the workday (6:30 AM)
        startOfWorkday.setHours(6, 0, 0, 0); // Hours, Minutes, Seconds, Milliseconds

        // Set the end of the workday (1:30 PM)
        endOfWorkday.setHours(13, 0, 0, 0); // Note: 13 = 1 PM in 24-hour time

        // Check if current time is within the workday hours
        return now >= startOfWorkday && now <= endOfWorkday;
    } else {
        // It's not a weekday
        return false;
    }
  }

  getOneDayBefore(dateString: string): string {
    // Parse the input string into a Date object
    const date = new Date(dateString+ 'T00:00:00');

    // Subtract one day
    date.setDate(date.getDate() - 1);

    // Format the date back into "YYYY-MM-DD"
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed in JavaScript
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

  lastClosedDate(): string {
    let now = new Date(); // Current date and time
    let lastClosed = new Date(now); // Start with the current date

    // Adjust for market hours
    if (now.getHours() < 6 || (now.getHours() === 6 && now.getMinutes() < 30)) {
        // If before 6:30 AM, move to previous day
        lastClosed.setDate(lastClosed.getDate() - 1);
    }

    // Adjust for weekends and before market opening times
    if (lastClosed.getDay() === 0) { // Sunday
        lastClosed.setDate(lastClosed.getDate() - 2); // Last closed market would be Friday
    } else if (lastClosed.getDay() === 6) { // Saturday
        lastClosed.setDate(lastClosed.getDate() - 1); // Last closed market would be Friday
    } else if (lastClosed.getDay() === 1) {
        lastClosed.setDate(lastClosed.getDate()-3);
    }

    // Format as "YYYY-MM-DD"
    const year = lastClosed.getFullYear();
    const month = String(lastClosed.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed, add leading zero
    const day = String(lastClosed.getDate()).padStart(2, '0'); // Add leading zero if needed

    return `${year}-${month}-${day}`;
}

  lastCloseTime():string {
    let now = new Date(); // Current date and time
    let lastClosed = new Date(now); // Start with the current date

    // Set the time to market's closing time by default
    lastClosed.setHours(13, 0, 0); // Market closes at 1:00 PM

    // Adjust for market hours
    if (now.getHours() < 6 || (now.getHours() === 6 && now.getMinutes() < 30)) {
        // If before 6:30 AM, move to previous day and set to yesterday's closing time
        lastClosed.setDate(lastClosed.getDate() - 1);
    } else if (now.getHours() > 13 || (now.getHours() === 13 && now.getMinutes() > 0)) {
        // If after 1:00 PM, the market is already closed today, no date adjustment needed
    } else {
        // During market hours, move to the previous day since today's market isn't closed yet
        lastClosed.setDate(lastClosed.getDate() - 1);
    }

    // Adjust for weekends: if Saturday or Sunday, set to Friday
    if (lastClosed.getDay() === 0) { // Sunday
        lastClosed.setDate(lastClosed.getDate() - 2); // Set to Friday
    } else if (lastClosed.getDay() === 6) { // Saturday
        lastClosed.setDate(lastClosed.getDate() - 1); // Set to Friday
    }

    // Format as "YYYY-MM-DD HH:MM:SS"
    const year = lastClosed.getFullYear();
    const month = String(lastClosed.getMonth() + 1).padStart(2, '0'); // Add leading zero if needed
    const day = String(lastClosed.getDate()).padStart(2, '0'); // Add leading zero if needed
    const hours = String(lastClosed.getHours()).padStart(2, '0');
    const minutes = String(lastClosed.getMinutes()).padStart(2, '0');
    const seconds = String(lastClosed.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  formatNum(num:string):string{
    return Number(num).toFixed(2);
  }

  async editWatchlist() {
    if (this.watching) {
      this.watching = false;
      this.removedFromWatchlist = true;
      this.mongoDbService.deleteWatchlistTicker(this.ticker).subscribe({
        next: async (response) => {
          console.log('Ticker deleted:', response);
          await this.delay(3000);
          this.removedFromWatchlist = false;
          // this.ngOnInit();
        },
        error: (error) => {
          console.error('Error deleting ticker:', error);
          this.watching = true;
        }
      });
    } else {
      this.watching = true;
      this.addedToWatchlist = true;
      let tickerData = {ticker:this.ticker, name:this.profileData.name};
      this.mongoDbService.addWatchlistTicker(tickerData).subscribe({
        next: async (response) => {
          console.log('Ticker added:', response);
          await this.delay(3000);
          this.addedToWatchlist = false;
        },
        error: (error) => {
          this.watching = false;
          this.addedToWatchlist = false;
          console.error('Error adding ticker:', error);
        }
      });
    }
    
  }

  async onBuy() {
    //update balance and portfolio
    const newBalance = Number(this.balance)-Number(this.modalTotal);
    const newQuantity = this.modalItem ? Number(this.modalItem.quantity)+Number(this.modalQuantity.value) : Number(this.modalQuantity.value);
    const newTotalCost = this.modalItem ? Number(this.modalTotal)+Number(this.modalItem.totalCost) : Number(this.modalTotal);
    const newData = {ticker: this.ticker, name: this.profileData.name, quantity: newQuantity, totalCost: newTotalCost};
    forkJoin({
      balance: this.mongoDbService.updateBalance(newBalance),
      portfolio: this.mongoDbService.addPortfolioTicker(newData),
    }).subscribe({
      next: async (res) => {
        this.modalService.dismissAll();
        this.boughtSuccessfully = true;
        this.owning = true;
        this.modalItem = newData;
        await this.delay(3000);
        this.boughtSuccessfully = false;
        // if (this.modal)
        // this.initializeData();
      },
      error: (err) => {
        console.error(err);
        this.modalService.dismissAll();
        // this.initializeData();
      }
    });
    // })
  }

  async onSell() {
    const newBalance = Number(this.balance)+Number(this.modalTotal);
    if (Number(this.modalQuantity.value) === Number(this.modalItem.quantity)) {
      //delete portfolio and update balance
      forkJoin({
        balance: this.mongoDbService.updateBalance(newBalance),
        portfolio: this.mongoDbService.deletePortfolioTicker(this.modalItem.ticker),
      }).subscribe({
        next: async (res) => {
          this.modalService.dismissAll();
          this.soldSuccessfully = true
          this.owning = false;
          this.modalItem.quantity = 0;
          await this.delay(3000);
          this.soldSuccessfully = false;
          
          // this.initializeData();
        },
        error: (err) => {
          console.error(err);
          this.modalService.dismissAll();
          // this.resetData();
        }
      });
    } else {
      const newQuantity = Number(this.modalItem.quantity)-Number(this.modalQuantity.value);
      const newTotalCost = Number(this.modalItem.totalCost)-Number(this.modalTotal)
      const newData = {ticker: this.ticker, name: this.profileData.name, quantity: newQuantity, totalCost: newTotalCost};
      forkJoin({
        balance: this.mongoDbService.updateBalance(newBalance),
        portfolio: this.mongoDbService.addPortfolioTicker(newData),
      }).subscribe({
        next: async (res) => {
          this.modalService.dismissAll();
          this.soldSuccessfully = true
          this.owning = true;
          this.modalItem = newData;
          await this.delay(3000);
          this.soldSuccessfully = false;
        },
        error: (err) => {
          console.error(err);
        }
      });
    }
  }

  open(modal:any) {
    console.log('open')
    this.modalQuantity.setValue(0);
    this.modalService.open(modal);
  }

  errorAlertClose() {
    this.router.navigateByUrl('/search/home')
  }

  alertClose() {
    this.error = false;
    this.addedToWatchlist = false;
    this.removedFromWatchlist = false;
    this.soldSuccessfully = false;
    this.boughtSuccessfully = false;
    this.notFound = false;
  }
}
