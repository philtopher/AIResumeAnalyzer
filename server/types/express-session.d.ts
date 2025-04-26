import "express-session";

interface RegistrationData {
  username: string;
  email: string;
  password: string;
  plan: string;
}

declare module "express-session" {
  interface SessionData {
    registrationData?: RegistrationData;
  }
}