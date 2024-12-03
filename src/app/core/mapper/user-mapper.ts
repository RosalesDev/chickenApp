import { User } from '../user/model/user-model';

export function mapToUser(id: string, data: any): User {
  return {
    uid: id,
    authUserId: data.external_id,
    email: data.email,
    displayName: data.user_name,
    roles: data.rol,
  };
}
