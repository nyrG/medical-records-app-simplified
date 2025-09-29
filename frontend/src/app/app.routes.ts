import { Routes } from "@angular/router";
import { Login } from "./pages/login/login";

export const routes: Routes = [
    { path: "login", component: Login },
    // We will add a protected '/profile' route and an auth guard later
    // { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
    { path: "", redirectTo: "/login", pathMatch: "full" },
];
