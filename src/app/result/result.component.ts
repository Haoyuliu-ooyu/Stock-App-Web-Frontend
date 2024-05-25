import { Component } from '@angular/core';
import { DetailsComponent } from '../details/details.component';

@Component({
  selector: 'app-result',
  standalone: true,
  imports: [DetailsComponent],
  templateUrl: './result.component.html',
  styleUrl: './result.component.css'
})
export class ResultComponent {

}
