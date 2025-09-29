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