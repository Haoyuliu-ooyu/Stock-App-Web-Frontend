import { Routes, RouteReuseStrategy, RouterModule, } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { WatchlistComponent } from './watchlist/watchlist.component';
import { PortfolioComponent } from './portfolio/portfolio.component';
import path from 'path';
import { Component } from '@angular/core';
import { CustomReuseStrategy } from './custom-reuse-strategy';

export const routes: Routes = [
    { path: '', redirectTo: 'search/home', pathMatch: 'full' },
    { path: 'search/home', component: HomeComponent },
    { path: 'search/:ticker', component: HomeComponent },
    // { path: 'search', component: HomeComponent,
    //     children: [
    //         { path: 'home', component: HomeComponent },
    //         { path: ':ticker', component: HomeComponent}
    //     ]
    // },
    { path: 'watchlist', component: WatchlistComponent },
    { path: 'portfolio', component: PortfolioComponent }
];

// RouterModule.forRoot(routes, {
//     // ...other router configurations
//     routeReuseStrategy: new CustomReuseStrategy(),
// });