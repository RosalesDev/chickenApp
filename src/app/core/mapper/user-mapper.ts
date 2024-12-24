import { User } from '../models/user-model';

export function mapToUser(id: string, data: any): User {
  return {
    uid: id,
    authUserId: data.external_id,
    email: data.email,
    userName: data.user_name,
    roles: data.rol,
    status: data.status,
  };
}
