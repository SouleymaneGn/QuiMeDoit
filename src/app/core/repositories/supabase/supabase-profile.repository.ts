import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { Profile, ProfileInput, UserRole } from '../../models/profile.model';
import { ProfileRepository } from '../profile.repository';
import { SupabaseService } from '../../services/supabase.service';

interface ProfileRow {
  id: string;
  owner_name: string;
  business_name: string;
  phone: string;
  currency: string;
  role: UserRole;
}

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    ownerName: row.owner_name,
    businessName: row.business_name,
    phone: row.phone,
    currency: row.currency,
    role: row.role
  };
}

@Injectable({ providedIn: 'root' })
export class SupabaseProfileRepository extends ProfileRepository {
  constructor(private readonly supabaseService: SupabaseService) {
    super();
  }

  get(): Observable<Profile> {
    return from(
      this.supabaseService.getUser().then(async ({ data: userData }) => {
        const userId = userData.user!.id;
        const { data, error } = await this.supabaseService.client
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (error) throw error;

        if (data) {
          return toProfile(data as ProfileRow);
        }

        // Compte créé avant la mise en place du trigger d'auto-provisioning : on crée la ligne manquante.
        const { data: created, error: insertError } = await this.supabaseService.client
          .from('profiles')
          .insert({ id: userId, owner_name: '', business_name: '', phone: '', currency: 'CFA' })
          .select()
          .single();
        if (insertError) throw insertError;
        return toProfile(created as ProfileRow);
      })
    );
  }

  update(patch: ProfileInput): Observable<Profile> {
    const row: Record<string, unknown> = {};
    if (patch.ownerName !== undefined) row['owner_name'] = patch.ownerName;
    if (patch.businessName !== undefined) row['business_name'] = patch.businessName;
    if (patch.phone !== undefined) row['phone'] = patch.phone;
    if (patch.currency !== undefined) row['currency'] = patch.currency;

    return from(
      this.supabaseService.getUser().then(async ({ data: userData }) => {
        const userId = userData.user!.id;
        // upsert au lieu d'update : couvre aussi les comptes sans ligne profiles existante
        // (créés avant le trigger d'auto-provisioning), au lieu d'échouer silencieusement.
        const { data, error } = await this.supabaseService.client
          .from('profiles')
          .upsert({ id: userId, ...row }, { onConflict: 'id' })
          .select()
          .single();
        if (error) throw error;
        return toProfile(data as ProfileRow);
      })
    );
  }
}
