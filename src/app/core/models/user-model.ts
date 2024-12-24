export class User {
  uid: string;
  authUserId: string;
  email: string;
  userName: string;
  roles: Role[];
  status: string;

  constructor(
    uid: string = '',
    authUserId: string = '',
    email: string = '',
    userName: string = '',
    roles: Role[] = [],
    status: string = 'active'
  ) {
    this.uid = uid;
    this.authUserId = authUserId;
    this.email = email;
    this.userName = userName;
    this.roles = roles;
    this.status = status;
  }
}
export type Role = 'ADMIN' | 'DELIVERY' | 'POS_USER';
