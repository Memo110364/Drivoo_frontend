import { Component, OnInit } from '@angular/core';
import { CoreService } from 'src/app/services/core.service';
import { Router, RouterModule } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import {LoginService} from 'src/app/login.service';
import {AuthService} from 'src/app/services/auth.service';

@Component({
  selector: 'app-logout',
  imports: [RouterModule, MaterialModule, FormsModule, ReactiveFormsModule],
  template: '',
  providers: [LoginService],
})
export class AppSideLogoutComponent implements OnInit {
    options = this.settings.getOptions();
  constructor(
    private settings: CoreService,
    private routes: Router,
    private service: LoginService,
    private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.logout();
    this.service.logout();
    console.log("logout");
    // رجّع المستخدم لصفحة تسجيل الدخول
    this.routes.navigate(['/authentication/login']);
  }
}
