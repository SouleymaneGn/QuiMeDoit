import { Injectable } from '@angular/core';
import { SignupPayload } from '../models/signup-payload.model';
import { LoginPayload } from '../models/login-payload.model';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environment/environment';

const REMEMBER_ME_KEY = 'cp-remember-me';

function isRemembered(): boolean {
  return localStorage.getItem(REMEMBER_ME_KEY) !== 'false';
}

// Session token goes to localStorage (survives browser close) when "remember me"
// is on, sessionStorage (cleared on browser close) otherwise. The preference flag
// itself always lives in localStorage so it can be read before the session storage
// is known.
const rememberAwareStorage = {
  getItem: (key: string) => (isRemembered() ? localStorage : sessionStorage).getItem(key),
  setItem: (key: string, value: string) => (isRemembered() ? localStorage : sessionStorage).setItem(key, value),
  removeItem: (key: string) => (isRemembered() ? localStorage : sessionStorage).removeItem(key)
};

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
   private readonly supabase: SupabaseClient;
  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          storage: rememberAwareStorage
        }
      }
    );
  }

  /** Call before signIn to control whether the session survives closing the browser. */
  setRememberMe(remember: boolean): void {
    const other = remember ? sessionStorage : localStorage;
    Object.keys(other)
      .filter(key => key.startsWith('sb-'))
      .forEach(key => other.removeItem(key));
    localStorage.setItem(REMEMBER_ME_KEY, String(remember));
  }

  async signInWithEmail(payload: LoginPayload) {
    return await this.supabase.auth.signInWithPassword({
      email: payload.email,
      password: payload.password,
    });
  }

  async signUpWithEmail(payload: SignupPayload) {
    return await this.supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          displayName: payload.name,
          phone: payload.phone || undefined,
        },
      },
    });
  }

  async getUser() {
    return await this.supabase.auth.getUser();
  }

  async getSession() {
    return await this.supabase.auth.getSession();
  }

  async signOut() {
    return await this.supabase.auth.signOut();
  }

  get client(): SupabaseClient {
    return this.supabase;
  }
}
