import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable} from 'rxjs';
import {BaseService} from './base.service';

export interface PluginsResponse {
  page: number;
  limit: number;
  total: number;
  data: Plugin[];
}

export interface Plugin {
  id: number;
  name: string;
  image: string;
  slug: string;
  is_active: boolean;
}

export interface PluginsQuery {
  q?: string;
  page: number;
  limit: number;
}

export interface PluginField {
  key: string;
  name: string;
  type: string;
  required: boolean;
  pattern?: string;
  options?: string[];
  help_text?: string;
  placeholder?: string;
}

@Injectable({providedIn: 'root'})
export class PluginsService extends BaseService {
  private http = inject(HttpClient);
  /** Rules and eligibility together — the screen needs both to offer the form. */
  getPlugins(query: PluginsQuery = {page: 1, limit: 24}): Observable<PluginsResponse> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<PluginsResponse>(`${this.baseUrl}plugins/list`, {params});
  }

  // pluginDetails(plugin_id: number): Observable<PluginDetailsResponse> {
  //   return this.http.get<PluginDetailsResponse>(`${this.baseUrl}plugins/${plugin_id}`);
  // }


}
