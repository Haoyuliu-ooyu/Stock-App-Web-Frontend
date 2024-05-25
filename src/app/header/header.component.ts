import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive} from '@angular/router'
import { OnInit } from '@angular/core';
import { DetailsService } from '../details.service';


@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit{
  url:string = 'home';

  constructor(private detailService:DetailsService) {}

  ngOnInit(): void {
    this.detailService.ticker$.subscribe(res=>{
      this.url = 'search/'+res;
    });
  }
}
