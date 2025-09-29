# Boveda-Lens: Angular Migration Action Plan

This document outlines the step-by-step process for migrating the current vanilla JavaScript frontend to Angular, transforming the project into a monorepo, and setting up a productive development environment with VS Code Workspaces.

## Phase 0: Project Setup & Monorepo Initialization

The first phase is to restructure the project into a monorepo, which will house the existing NestJS backend and the new Angular frontend as separate, co-located packages.

### 1. Initialize `npm` Workspaces

We will use `npm`'s built-in workspaces feature to manage the monorepo.

- Create a `package.json` file at the project root.
- Define the `workspaces` array to include the `backend` and a new `frontend` directory.

  ```json
  // root/package.json
  {
    "name": "boveda-lens-monorepo",
    "version": "1.0.0",
    "private": true,
    "workspaces": ["backend", "frontend"],
    "scripts": {
      "install:all": "npm install",
      "start:backend": "npm run start:dev --workspace=backend",
      "start:frontend": "npm start --workspace=frontend",
      "build:backend": "npm run build --workspace=backend",
      "build:frontend": "npm run build --workspace=frontend"
    }
  }
  ```

### 2. Initialize the Angular Application

We'll use the Angular CLI to create a new Angular project in the `frontend` directory.

```bash
# Make sure you have the Angular CLI installed globally
npm install -g @angular/cli

# From the project root, run:
ng new frontend --directory frontend --routing --style=css --standalone --skip-install
```

- `--directory frontend`: Creates the app in the `frontend` folder.
- `--standalone`: Uses the modern, standalone component architecture.
- `--skip-install`: Prevents an immediate `npm install`, as we'll manage it from the root.

### 3. Prepare for Monorepo Installation

**Crucial Step**: Before installing dependencies for the entire monorepo, you must remove the old, isolated dependency files from the `backend` project. This ensures that `npm` workspaces can correctly manage all dependencies from the root.

- In your file explorer, navigate to the `backend` directory.
- **Delete the `node_modules` folder.**
- **Delete the `package-lock.json` file.**

### 4. Install All Dependencies

Now, from the project root, run the `install:all` script defined in your root `package.json`. This will install dependencies for both the backend and the new frontend into a single `node_modules` folder at the root.

```bash
npm run install:all
```

### 4. Create a VS Code Workspace

A `.code-workspace` file will help you manage the monorepo easily in VS Code.

- Create a `.vscode` folder at the root.
- Inside `.vscode`, create a file named `boveda-lens.code-workspace`.

  ```json
  // .vscode/boveda-lens.code-workspace
  {
    "folders": [
      {
        "name": "Backend (NestJS)",
        "path": "../backend"
      },
      {
        "name": "Frontend (Angular)",
        "path": "../frontend"
      }
    ],
    "settings": {
      "workbench.colorCustomizations": {
        "activityBar.background": "#2C3E50",
        "titleBar.activeBackground": "#2C3E50",
        "titleBar.activeForeground": "#FFFFFF"
      }
    }
  }
  ```

- Close your current VS Code window and open this `.code-workspace` file (`File > Open Workspace from File...`).

## Phase 1: Integrating Angular with the NestJS Backend

To ensure the Angular app can communicate with the backend during development, we'll set up a proxy.

### 1. Create a Proxy Configuration

In the `frontend` directory, create a file named `proxy.conf.json`. This will forward all requests starting with `/api` to your NestJS server.

```json
// frontend/proxy.conf.json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false
  }
}
```

### 2. Update Angular's `serve` Configuration

Modify `angular.json` in the `frontend` directory to use this proxy file when you run `ng serve`.

```json
// In frontend/angular.json, find "serve" -> "options"
"architect": {
  "serve": {
    "builder": "@angular-devkit/build-angular:dev-server",
    "configurations": { ... },
    "options": {
      "proxyConfig": "proxy.conf.json" // Add this line
    }
  },
  ...
}
```

Now, when you run `npm run start:frontend` (or `ng serve` from the `frontend` folder), any HTTP call from your Angular app to `/api/...` will be transparently proxied to `http://localhost:3000/api/...`.

## Phase 2: Component-Based Migration

This phase focuses on building a complete, self-contained **User Management** module in Angular. This includes login, logout, and a protected profile page. We will build and verify each piece incrementally.

### Step 2.1: Enable HTTP Client

To communicate with your backend, you need to enable Angular's `HttpClient`.

1.  **Action**: Open `frontend/src/app/app.config.ts`.
2.  **Action**: Import `provideHttpClient` and add it to the `providers` array.

    ```typescript
    // frontend/src/app/app.config.ts
    import { ApplicationConfig } from "@angular/core";
    import { provideRouter } from "@angular/router";
    import { provideHttpClient } from "@angular/common/http"; // Import this
    import { routes } from "./app.routes";

    export const appConfig: ApplicationConfig = {
      providers: [
        provideRouter(routes),
        provideHttpClient(), // Add this
      ],
    };
    ```

### Step 2.2: Create the Authentication Service

This service will manage all authentication logic, such as making API calls and handling user tokens.

1.  **Action**: Generate the service.

    ```bash
    # Run from the frontend/ directory
    ng generate service services/auth
    ```

2.  **Action**: Add basic login/logout methods to `frontend/src/app/services/auth.service.ts`.

    ```typescript
    // frontend/src/app/services/auth.service.ts
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

      constructor(private http: HttpClient) {}

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
    ```

### Step 2.3: Create and Implement the Login Component

This component will provide the user interface for logging in.

1.  **Action**: Generate the component.

    ```bash
    # Run from the frontend/ directory
    ng generate component components/login --standalone
    ```

2.  **Action**: Create a simple login form in `login.component.html`.

    ```html
    <!-- frontend/src/app/components/login/login.component.html -->
    <div class="max-w-md mx-auto mt-10 p-8 border rounded-lg shadow-lg">
      <h2 class="text-2xl font-bold mb-6 text-center">Login</h2>
      <form #loginForm="ngForm" (ngSubmit)="onSubmit()">
        <div class="mb-4">
          <label for="email" class="block text-gray-700">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            [(ngModel)]="credentials.email"
            required
            email
            class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div class="mb-6">
          <label for="password" class="block text-gray-700">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            [(ngModel)]="credentials.pass"
            required
            class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          [disabled]="loginForm.invalid"
          class="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          Login
        </button>

        @if (errorMessage) {
        <p class="mt-4 text-center text-red-500">{{ errorMessage }}</p>
        }
      </form>
    </div>
    ```

3.  **Action**: Implement the component logic in `login.component.ts` to handle form submission.

    ```typescript
    // frontend/src/app/components/login/login.component.ts
    import { Component, inject } from "@angular/core";
    import { FormsModule } from "@angular/forms";
    import { Router } from "@angular/router";
    import { AuthService } from "../../services/auth.service";

    @Component({
      selector: "app-login",
      standalone: true,
      imports: [FormsModule], // Import FormsModule for ngModel
      templateUrl: "./login.component.html",
    })
    export class LoginComponent {
      private authService = inject(AuthService);
      private router = inject(Router);

      credentials = { email: "", pass: "" };
      errorMessage = "";

      onSubmit() {
        this.errorMessage = ""; // Reset error message
        this.authService.login(this.credentials).subscribe({
          next: () => {
            // On successful login, navigate to a protected route (e.g., '/profile')
            // We will create this route in the next step.
            this.router.navigate(["/profile"]);
          },
          error: (err) => {
            console.error("Login failed", err);
            this.errorMessage = "Invalid email or password. Please try again.";
          },
        });
      }
    }
    ```

### Step 2.4: Implement Routing

Set up the application's routes to navigate between the login page and a future profile page.

1.  **Action**: Open `frontend/src/app/app.routes.ts` and define the routes.

    ```typescript
    // frontend/src/app/app.routes.ts
    import { Routes } from "@angular/router";
    import { LoginComponent } from "./components/login/login.component";

    export const routes: Routes = [
      { path: "login", component: LoginComponent },
      // We will add a protected '/profile' route and an auth guard later
      // { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
      { path: "", redirectTo: "/login", pathMatch: "full" },
    ];
    ```

2.  **Action**: Ensure your main `app.component.html` has a `<router-outlet>` to render the routes.
    ```html
    <!-- frontend/src/app/app.component.html -->
    <main class="container mx-auto p-4">
      <router-outlet></router-outlet>
    </main>
    ```

### Step 2.5: Verification

Let's verify that the login flow is working.

1.  **Action**: Start both the backend and frontend servers from the project root.
    ```bash
    npm run start:backend
    # In a new terminal
    npm run start:frontend
    ```
2.  **Verification**: Open your browser to `http://localhost:4200`. You should be redirected to the login page.
3.  **Verification**: Open your browser's developer tools (F12) and go to the "Network" tab.
4.  **Action**: Enter valid credentials and submit the form.
5.  **Verification**:
    - You should see a `POST` request to `http://localhost:4200/api/auth/login` that returns a `201 Created` status.
    - In the "Application" tab of your developer tools, check `Local Storage`. You should see a key named `auth_token` with a value (the JWT).

Once these steps are verified, you have successfully built the core authentication logic. The next steps would be to create a protected profile page and an authentication guard to restrict access.

## Phase 3: Hybrid Integration & Gradual Migration

Once the new User Management feature is ready, you will integrate it with the old application.

1.  **Build the Angular App**: Run `npm run build:frontend` from the root. This creates a `dist/frontend/browser` directory with your production-ready static files.
2.  **Configure NestJS for Hybrid Serving**: In `backend/src/main.ts`, configure the `serve-static` module to serve both the new Angular app (at the root `/`) and the old frontend files (e.g., from `/legacy`). After a user logs in via the Angular app, they will be redirected to the legacy patient management pages.

3.  **Incremental Migration**: After the initial integration is stable, you can begin migrating existing features from the old Vanilla JS app into new Angular components, one by one. Good candidates to migrate next are:

    - The Patient List table.
    - The Patient Detail view.
    - The PDF upload/extraction form.

4.  **Decommission**: Once **all** features are migrated into Angular and the hybrid setup is no longer needed, you can safely delete the old frontend files from the `backend/public` directory.

This plan provides a structured path from your current setup to a modern, maintainable monorepo. Good luck!
