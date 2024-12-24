import { Injectable } from '@angular/core';
import { Role, User } from '../models/user-model';

@Injectable({
  providedIn: 'root',
})
export class RolesService {
  hasRole(user: User, requiredRole: Role): boolean {
    return user.roles.includes(requiredRole);
  }
}
