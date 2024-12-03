export interface User {
  uid: string;
  authUserId: string;
  email: string;
  displayName: string;
  roles: Role[];
}

export type Role = 'ADMIN' | 'DELIVERY' | 'POS_USER';
