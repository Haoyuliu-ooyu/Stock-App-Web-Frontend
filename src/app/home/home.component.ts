
import { Component, OnInit } from '@angular/core';
import { FormsModule, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, of, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ResultComponent } from '../result/result.component';
import { NgIf } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DetailsService } from '../details.service';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import { debounceTime, switchMap, map, tap, filter, startWith, catchError, finalize } from 'rxjs/operators';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DetailsComponent } from '../details/details.component';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  standalone: true,
  imports: [FormsModule, HttpClientModule, CommonModule, ResultComponent, NgIf, MatAutocompleteModule, MatInputModule, ReactiveFormsModule, MatProgressSpinnerModule, DetailsComponent]
}
)
export class HomeComponent implements OnInit {
  searchQuery = new FormControl('');
  // filteredOptions!: Observable<any[]>;
  filteredOptions!: any[];
  showError: boolean = false;
  isLoading: boolean = false;

  // private subscriptions = new Subscription(); // To manage subscriptions
  constructor(private formBuilder: FormBuilder, private router: Router, private detailService:DetailsService, private activatedRoute: ActivatedRoute) {}

  ngOnInit(): void {
    // Set the search query based on the URL parameter or some default value
    this.activatedRoute.paramMap.subscribe((params) => {
      if (!this.router.url.includes('/search/home')) {
        this.searchQuery.setValue(this.router.url.split('/').pop()!);
      }
    });

    this.searchQuery.valueChanges.pipe(
        debounceTime(300),
        tap(value => {
            if (value !== '' && value != this.detailService.getCurrentTicker()) {
                this.isLoading = true;
            } else {
              this.isLoading = false
            }
            this.filteredOptions = [];
        }),
        switchMap(value => {
          if (value !== '') {
            return this.detailService.getAutoComplete(value!);
          } else {
            return [];
          }
        }),
        tap(() => this.isLoading = true),
      ).subscribe(response => {
        if (response && response.result) {
          this.filteredOptions = JSON.parse(JSON.stringify(response)).result.filter((item: { symbol: string }) => !item.symbol.includes('.'));
          this.isLoading=false
        }

      });
  }

  onSearchOptions(ticker: any) {
    this.searchQuery.setValue(ticker);
    this.onSearch();
  }

  onSearch() {
    this.isLoading = false;
    if (!this.searchQuery.value) {
      this.showError = true;
    } else {
      this.showError = false;
      // this.detailService.setTicker(this.searchQuery.value);
      this.router.navigate(['/search', this.searchQuery.value]);
      this.filteredOptions = [];
    }
  }

  onClear(): void {
    this.filteredOptions = [];
    this.searchQuery.setValue('');
    this.router.navigate(['/search/home']);
  }

  isSearchResult(): boolean {
    return !this.router.url.includes('/search/home');
  }
}