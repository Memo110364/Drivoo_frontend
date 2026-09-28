import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";

@Injectable({
    providedIn: "root"
})
export class BaseService {

    /**
     * Every service inherits this, so `environment.apiUrl` is the only place
     * that decides which API the app talks to. The development environment
     * keeps the address this was hardcoded to, so nothing changes locally.
     */
    baseUrl = environment.apiUrl;

}
