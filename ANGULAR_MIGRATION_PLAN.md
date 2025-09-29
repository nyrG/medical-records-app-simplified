# Boveda-Lens: Angular Migration Action Plan

This document outlines the step-by-step process for migrating the current vanilla JavaScript frontend to Angular, transforming the project into a monorepo, and setting up a productive development environment with VS Code Workspaces.

## Phase 0: Initial Setup & Monorepo Transformation

This phase covers cloning the project, setting up the necessary backend configurations, and restructuring the project into a monorepo.

### 1. Prerequisites

Before you begin, ensure you have the following:

- Node.js (v18 or higher)
- A Google Gemini API Key.
- A connection URL from a Neon PostgreSQL database.

### 2. Clone the Repository

First, clone the project repository to your local machine.

```bash
git clone https://github.com/your-username/boveda-lens.git
cd boveda-lens
```

### 3. Initialize `npm` Workspaces

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

### 5. Configure the NestJS Backend Environment

Before the backend can run correctly and handle requests from the new Angular frontend, it needs to be configured. This typically involves setting up environment variables for the database connection, JWT secrets, and other application settings.

1.  **Action**: Navigate to the `backend` directory.
2.  **Action**: Look for a file named `.env.example` or similar. If it exists, create a copy of it and name it `.env`.

    ```bash
    # From the backend/ directory
    cp .env.example .env
    ```

3.  **Action**: Open the new `.env` file and fill in the required values. This will include credentials for your local PostgreSQL database and a secret for signing JWTs.

    ```ini
    # backend/.env
    DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME"
    JWT_SECRET="YOUR_SUPER_SECRET_KEY"
    ```

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

This phase focuses on building a complete, self-contained **User Management** feature, which includes both the backend logic in NestJS and the frontend components in Angular. We will build and verify each piece incrementally.

### Step 2.0: Implement Backend Authentication

Before creating the frontend login page, we need to implement the authentication logic in the NestJS backend. This involves setting up a User entity, handling password hashing, generating JSON Web Tokens (JWT), and creating the login endpoint.

1.  **Action**: Install required dependencies for authentication.

    ```bash
    # From the project root
    npm install @nestjs/passport @nestjs/jwt passport passport-jwt bcrypt --workspace=backend
    npm install @types/passport-jwt @types/bcrypt --save-dev --workspace=backend
    ```

2.  **Action**: Create a `User` entity. Create a new file `backend/src/users/user.entity.ts`.

    ```typescript
    // backend/src/users/user.entity.ts
    import {
      Entity,
      Column,
      PrimaryGeneratedColumn,
      BeforeInsert,
    } from "typeorm";
    import * as bcrypt from "bcrypt";

    @Entity("users")
    export class User {
      @PrimaryGeneratedColumn("uuid")
      id: string;

      @Column({ unique: true })
      email: string;

      @Column()
      password_hash: string;

      @Column({ nullable: true })
      name: string;

      @BeforeInsert()
      async hashPassword() {
        if (this.password_hash) {
          this.password_hash = await bcrypt.hash(this.password_hash, 10);
        }
      }

      async validatePassword(password: string): Promise<boolean> {
        return bcrypt.compare(password, this.password_hash);
      }
    }
    ```

3.  **Action**: Create a `Users` module and service to manage user data.

    ```bash
    # From the backend/ directory
    nest generate module users
    nest generate service users
    ```

4.  **Action**: Update `backend/src/users/users.module.ts` to expose the `UsersService`.

    ```typescript
    // backend/src/users/users.module.ts
    import { Module } from "@nestjs/common";
    import { TypeOrmModule } from "@nestjs/typeorm";
    import { UsersService } from "./users.service";
    import { User } from "./user.entity";

    @Module({
      imports: [TypeOrmModule.forFeature([User])],
      providers: [UsersService],
      exports: [UsersService], // Export UsersService for other modules
    })
    export class UsersModule {}
    ```

5.  **Action**: Update `backend/src/users/users.service.ts` to find users.

    ```typescript
    // backend/src/users/users.service.ts
    import { Injectable } from "@nestjs/common";
    import { InjectRepository } from "@nestjs/typeorm";
    import { Repository } from "typeorm";
    import { User } from "./user.entity";

    @Injectable()
    export class UsersService {
      constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>
      ) {}

      async findOne(email: string): Promise<User | undefined> {
        return this.usersRepository.findOne({ where: { email } });
      }
    }
    ```

6.  **Action**: Create the `Auth` module, service, and controller.

    ```bash
    # From the backend/ directory
    nest generate module auth
    nest generate service auth
    nest generate controller auth
    ```

7.  **Action**: Configure the `AuthModule` in `backend/src/auth/auth.module.ts`. This sets up JWT support.

    ```typescript
    // backend/src/auth/auth.module.ts
    import { Module } from "@nestjs/common";
    import { AuthService } from "./auth.service";
    import { AuthController } from "./auth.controller";
    import { UsersModule } from "../users/users.module";
    import { JwtModule } from "@nestjs/jwt";
    import { ConfigModule, ConfigService } from "@nestjs/config";

    @Module({
      imports: [
        UsersModule,
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            secret: configService.get<string>("JWT_SECRET"),
            signOptions: { expiresIn: "60m" },
          }),
          inject: [ConfigService],
        }),
      ],
      providers: [AuthService],
      controllers: [AuthController],
    })
    export class AuthModule {}
    ```

8.  **Action**: Implement the login logic in `backend/src/auth/auth.service.ts`.

    ```typescript
    // backend/src/auth/auth.service.ts
    import { Injectable, UnauthorizedException } from "@nestjs/common";
    import { UsersService } from "../users/users.service";
    import { JwtService } from "@nestjs/jwt";

    @Injectable()
    export class AuthService {
      constructor(
        private usersService: UsersService,
        private jwtService: JwtService
      ) {}

      async signIn(
        email: string,
        pass: string
      ): Promise<{ access_token: string }> {
        const user = await this.usersService.findOne(email);
        if (!user || !(await user.validatePassword(pass))) {
          throw new UnauthorizedException("Invalid credentials");
        }
        const payload = { sub: user.id, email: user.email };
        return {
          access_token: await this.jwtService.signAsync(payload),
        };
      }
    }
    ```

9.  **Action**: Create the `/api/auth/login` endpoint in `backend/src/auth/auth.controller.ts`.

    ```typescript
    // backend/src/auth/auth.controller.ts
    import {
      Body,
      Controller,
      Post,
      HttpCode,
      HttpStatus,
    } from "@nestjs/common";
    import { AuthService } from "./auth.service";

    @Controller("auth")
    export class AuthController {
      constructor(private authService: AuthService) {}

      @HttpCode(HttpStatus.OK)
      @Post("login")
      signIn(@Body() signInDto: Record<string, any>) {
        return this.authService.signIn(signInDto.email, signInDto.pass);
      }
    }
    ```

10. **Action**: Import the new `AuthModule` and `UsersModule` into the root `AppModule` in `backend/src/app.module.ts`.

    ```diff
    --- a/backend/src/app.module.ts
    +++ b/backend/src/app.module.ts
    @@ -6,6 +6,8 @@
     import { Patient } from './patients/patient.entity';
     import { Encounter } from './patients/encounter.entity';
     import { ExtractionModule } from './extraction/extraction.module';
    +import { AuthModule } from './auth/auth.module';
    +import { UsersModule } from './users/users.module';

     @Module({
       imports: [
    @@ -18,6 +20,8 @@
           synchronize: true, // DEV only
         }),
         ExtractionModule,
    +    AuthModule,
    +    UsersModule,
       ],
       controllers: [AppController],
       providers: [AppService],
     })
     export class AppModule {}
    ```

11. **Action**: To test the login, you'll need a user in your database. A user seeding service has been created that will automatically add a test user to your database when the application starts if one doesn't already exist.

    The credentials for the test user are:
    - **Email**: `test@example.com`
    - **Password**: `password`

With these steps, your NestJS backend now has a fully functional `/api/auth/login` endpoint ready to authenticate users for the Angular frontend.

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
    # To get the conventional 'auth.service.ts' filename, we specify it directly.
    ng generate service services/auth.service
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
    # We will place route-level components in a `pages` directory for better organization.
    ng generate component pages/login --standalone
    ```

    > **Note on Naming**: Your Angular CLI setup generates files without the `.component` suffix (e.g., `login.ts`). We will follow this convention for consistency. The class name will be `Login`.

2.  **Action**: Create a simple login form in `login.component.html`.

    > Note: The file will be `login.html` based on the generator output.

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
    // frontend/src/app/pages/login/login.ts
    import { Component, inject } from "@angular/core";
    import { FormsModule } from "@angular/forms";
    import { Router } from "@angular/router";
    import { AuthService } from "../../services/auth.service";

    @Component({
      selector: "app-login",
      standalone: true,
      imports: [FormsModule], // Import FormsModule for ngModel
      templateUrl: "./login.html",
    })
    export class Login {
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
    import { Login } from "./pages/login/login";

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
