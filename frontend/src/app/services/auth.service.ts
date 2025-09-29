import { Injectable, signal, computed } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { tap } from "rxjs/operators";
import { toSignal } from "@angular/core/rxjs-interop";

@Injectable({ providedIn: "root" })
export class AuthService {
    private apiUrl = "/api/auth"; // Proxied to NestJS
    // Create a signal to hold the token. Initialize from localStorage.
    private authToken = signal<string | null>(
        localStorage.getItem("auth_token")
    );

    // Create a computed signal that derives the login status from the token.
    // This will automatically update whenever the authToken signal changes.
    isLoggedIn = computed(() => !!this.authToken());

    constructor(private http: HttpClient) { }

    login(credentials: { email: string; pass: string }) {
        return this.http
            .post<{ access_token: string }>(`${this.apiUrl}/login`, credentials)
            .pipe(
                tap((response) => {
                    // Store the token and update the signal
                    localStorage.setItem("auth_token", response.access_token);
                    this.authToken.set(response.access_token);
                })
            );
    }

    logout() {
        localStorage.removeItem("auth_token");
        this.authToken.set(null);
    }

    // Optional: A way to get the current token for authenticated requests
    getToken(): string | null {
        return this.authToken();
    }
}