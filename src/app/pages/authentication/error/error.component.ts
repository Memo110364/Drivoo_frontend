import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-error',
    imports: [RouterModule, MatButtonModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './error.component.html'
})
export class AppErrorComponent { }
