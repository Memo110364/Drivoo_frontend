import { Component } from '@angular/core';
import { CoreService } from 'src/app/services/core.service';

import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
// import { LoginService } from 'src/app/login.service';
import {AuthService} from 'src/app/services/auth.service'
import { LoadingService } from '../../../services/loading.service';


@Component({
  selector: 'app-side-login',
  imports: [RouterModule, MaterialModule, FormsModule, ReactiveFormsModule],
  templateUrl: './side-login.component.html',
  providers: [AuthService],
})
export class AppSideLoginComponent {
  options = this.settings.getOptions();
  msg = '';
  constructor(
    private settings: CoreService,
    private routes: Router,
    private service: AuthService,
    private loadingService: LoadingService
  ) { }

  form = new FormGroup({
    uname: new FormControl('', [Validators.required, Validators.minLength(5)]),
    password: new FormControl('', [Validators.required]),
  });

  get f() {
    return this.form.controls;
  }

 check(uname: string | any, p: string | any) {
  this.form.controls['uname'].disable();
  this.form.controls['password'].disable();
  this.loadingService.show();
    this.service.login({username:uname,password:p}).subscribe({
      next: (response) => {
        this.routes.navigate(['/']);
        this.form.controls['uname'].enable();
        this.form.controls['password'].enable();
        this.loadingService.hide();

      },
      error: (error) => {
        this.msg = 'Invalid Username or Password';
        this.form.controls['uname'].enable();
        this.form.controls['password'].enable();
        this.loadingService.hide();
      }
    });
  }
}
