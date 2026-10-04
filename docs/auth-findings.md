# Authentication — findings for the backend/platform developer

Found while rebuilding the sign-in screen. **None of it is changed on this
branch** — the branch is UI only, by agreement — so every item below is still
live on `main`.

The first three are security issues.

---

## 1. The auth interceptor is switched off

`src/app/app.config.ts`:

```ts
provideHttpClient(withInterceptors([loadingInterceptor])),
// { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
```

`AuthInterceptor` is commented out, so **no `Authorization` header is sent on
any request in the app**, and the 401 → refresh path never runs.

`docs/API_DOCUMENTATION.md` §2.2 says the refresh endpoint "يتم استدعاؤه
تلقائياً بواسطة الـ Interceptor عند كود 401". It is not — the interceptor is
not registered.

Note that `provideHttpClient(withInterceptors([...]))` takes *functional*
interceptors, while `AuthInterceptor` is a class-based `HttpInterceptor`. Just
un-commenting the `HTTP_INTERCEPTORS` line also needs
`withInterceptorsFromDi()` added to `provideHttpClient`, or the class has to be
converted to an `HttpInterceptorFn`.

## 2. Signing out leaves the tokens behind

`AppSideLogoutComponent` calls `LoginService.logout()`, which does one thing:

```ts
logout() { localStorage.removeItem('username'); }
```

That is what `AuthGuard` checks, so navigation is blocked — but
`AuthService.logout()`, which clears `accessToken` and `refreshToken` from
`sessionStorage`, **is never called**. After signing out, the tokens are still
in the browser. On a shared or public machine that is a real exposure.

## 3. A second, hardcoded login path ships in the bundle

`src/app/login.service.ts`:

```ts
checkusernameandpassword(uname: string, pwd: string) {
  if (uname === 'admin' && pwd === 'admin123') { ... return true; }
}
```

There are two parallel auth implementations: `AuthService` (the real API) and
`LoginService` (hardcoded credentials). The sign-in page uses the first, the
sign-out page uses the second. The hardcoded pair is compiled into every build.

---

## 4. `AuthService` does not use `environment.apiUrl`

```ts
private apiUrl = 'http://localhost:3000';
...
this.http.post(`${this.apiUrl}/user/login`, ...)
this.http.post(`${this.apiUrl}/refresh`, ...)
```

Two problems:

- Every other service extends `BaseService`, which reads `environment.apiUrl`
  (`http://localhost:3000/api/v1/`). `AuthService` has its own base and a
  different path shape, so a production build points every service at the real
  API **except this one**, which still points at localhost.
- It posts to `/refresh`, but `docs/API_DOCUMENTATION.md` §2.2 and the mock
  both define **`/auth/refresh`**.

## 5. The refresh path can loop

`AuthInterceptor` reacts to a 401 by calling `refreshAccessToken()`, which is
itself an `HttpClient` call and so passes through the same interceptor. If the
refresh request returns 401, it triggers another refresh, and so on. There is
also no sign-out when refreshing fails — the session is left broken rather than
ended.

## 6. Token and session lifetimes disagree

Tokens go to `sessionStorage`; `username` — what `AuthGuard` reads — goes to
`localStorage`. Closing the tab clears the tokens but not the username, so on
the next visit the guard says "signed in" and every API call then fails
unauthenticated. **This is user-visible today.**

## 7. `providers: [AuthService]` on the component

`AuthService` is provided on `AppSideLoginComponent`, so that component gets
its own instance, separate from whatever the interceptor would inject. The
in-memory `accessToken`/`refreshToken` fields therefore never line up between
them; it only works at all because `sessionStorage` is the real store. The
service wants `providedIn: 'root'`.

---

## 8. Smaller things

- **The language choice is not persisted.** `CoreService` keeps it in a signal
  only, so a reload reverts to the default. The switch now on the sign-in page
  makes this easy to notice.
- `src/app/services/auth.service.ts` writes `localStorage.setItem('username',
  res.name)` — the display name, under the key the guard treats as identity.

---

## What this branch changed instead

UI only: the sign-in screen, a new forgot-password screen, the strings, and the
removal of the self-serve register route. No service, guard, interceptor or
`app.config.ts` was touched.
