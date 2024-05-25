import { Component, OnInit, inject } from '@angular/core';
import { NgIf, NgClass, NgFor } from '@angular/common';
import { DetailsService } from '../details.service';
import { MongodbService } from '../mongodb.service';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import { FormsModule, FormControl, ReactiveFormsModule } from '@angular/forms'; 
import { NgbModal, NgbModalConfig, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { forkJoin, map } from 'rxjs'
import { ThisReceiver } from '@angular/compiler';
import { toUSVString } from 'util';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [MatProgressSpinnerModule, NgIf, NgClass, NgFor, FormsModule, ReactiveFormsModule],
  templateUrl: './portfolio.component.html',
  styleUrl: './portfolio.component.css'
})
export class PortfolioComponent implements OnInit{

  constructor(private detailService: DetailsService, private mongoDbService: MongodbService) {}

  private modalService = inject(NgbModal);

  isLoading:boolean= false;
  empty:boolean = false;
  portfolio:any[] = [];
  balance:number = 0;
  modalItem:any = {};
  itemIndex:any = -1;
  modalQuantity = new FormControl(0);
  modalTotal:number = 0;
  errorBuy:boolean = false;
  errorSell:boolean = false;

  soldSuccessfully: boolean = false;
  boughtSuccessfully: boolean = false;

  ngOnInit():void {
    this.isLoading = true;
    this.loadData();
  }

  loadData() {
    
    forkJoin({
      balance: this.mongoDbService.getBalance(),
      portfolio: this.mongoDbService.getPortfolioTIckers(),
    }).subscribe({
      next: ({balance, portfolio}) => {
        this.balance = Number(Number(balance).toFixed(2));
        this.setPortfolio(portfolio);

        this.isLoading = false;
      }
    })

    this.modalQuantity.valueChanges.subscribe(value=> {
      if (value != null) {
        this.modalTotal = Number((value*(this.modalItem.currentPrice)).toFixed(2));
        this.errorBuy = this.modalTotal > this.balance;
        this.errorSell = (value > this.modalItem.quantity);
      } else {
        this.modalTotal = 0;
        this.errorBuy = false;
        this.errorSell = false;
      }
    })
  }

  open(modal:any, modalItem:any, index:number) {
    this.modalItem = modalItem;
    this.itemIndex = index;
    this.modalQuantity.setValue(0);
    this.modalService.open(modal);
  }

  alertClose() {
    this.soldSuccessfully = false;
    this.boughtSuccessfully = false;
  }

  async delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
  }

  async onBuy() {
    //update balance and portfolio
    const newBalance = Number(this.balance)-Number(this.modalTotal);
    const newQuantity = Number(this.modalItem.quantity)+Number(this.modalQuantity.value);
    const newTotalCost = Number(this.modalTotal)+Number(this.modalItem.totalCost)
    const newData = {ticker: this.modalItem.ticker, name: this.modalItem.name, quantity: newQuantity, totalCost: newTotalCost};
    forkJoin({
      balance: this.mongoDbService.updateBalance(newBalance),
      portfolio: this.mongoDbService.addPortfolioTicker(newData),
    }).subscribe({
      next: async (res) => {
        this.modalService.dismissAll();
        this.boughtSuccessfully = true;
        this.loadData();

        await this.delay(3000);
        this.boughtSuccessfully = false
      },
      error: (err) => {
        console.error(err);
        this.modalService.dismissAll();
        this.loadData();
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
          this.soldSuccessfully = true;
          this.loadData();
          await this.delay(3000);
          this.soldSuccessfully = false;
        },
        error: (err) => {
          console.error(err);
          this.modalService.dismissAll();
          this.loadData();
        }
      });
    } else {
      const newQuantity = Number(this.modalItem.quantity)-Number(this.modalQuantity.value);
      const newTotalCost = Number(this.modalItem.totalCost)-Number(this.modalTotal)
      const newData = {ticker: this.modalItem.ticker, name: this.modalItem.name, quantity: newQuantity, totalCost: newTotalCost};
      forkJoin({
        balance: this.mongoDbService.updateBalance(newBalance),
        portfolio: this.mongoDbService.addPortfolioTicker(newData),
      }).subscribe({
        next: async (res) => {
          this.modalService.dismissAll();
          this.soldSuccessfully = true;
          this.loadData();
          await this.delay(3000);
          this.soldSuccessfully = false;
        },
        error: (err) => {
          console.error(err);
        }
      });
    }
  }

  setPortfolio(res:any):void {
    this.portfolio = res;
    this.empty = res.length === 0;
    const quoteRequests = this.portfolio.map(portfolio => 
      this.detailService.getQuote(portfolio.ticker)
    );

    if (quoteRequests.length > 0) {
      forkJoin(quoteRequests).pipe(
        map(quotes => {
          return quotes.map((quote, index) => {
            const change = Number(((Number(quote.c) - this.portfolio[index].totalCost/this.portfolio[index].quantity)).toFixed(2))
            return {
              ...this.portfolio[index],
              totalCost: this.portfolio[index].totalCost.toFixed(2),
              currentPrice: this.formatNum(quote.c),
              avgCost: (this.portfolio[index].totalCost/this.portfolio[index].quantity).toFixed(2),
              change: change,
              currentValue: (Number(quote.c)*this.portfolio[index].quantity).toFixed(2),
              positive: change<0,
              negative: change>0,
            };
          });
        })
      ).subscribe(enhancedPortfolio => {
        this.portfolio = enhancedPortfolio;
      });
    } else {
    }
  }

  formatNum(num:string):string{
    return Number(num).toFixed(2);
  }
  

}

