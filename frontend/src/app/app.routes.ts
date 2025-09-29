import { Routes } from "@angular/router";
import { Login } from "./pages/login/login";
import { Profile } from "./pages/profile/profile";
import { authGuard } from "./guards/auth-guard";

export const routes: Routes = [
    { path: "login", component: Login },
    { path: 'profile', component: Profile, canActivate: [authGuard] },
    { path: "", redirectTo: "/login", pathMatch: "full" },
];
