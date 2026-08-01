import { Injectable } from '@angular/core';
import { SignupPayload } from '../models/signup-payload.model';
import { LoginPayload } from '../models/login-payload.model';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environment/environment';


@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
   private readonly supabase: SupabaseClient;
  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
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
