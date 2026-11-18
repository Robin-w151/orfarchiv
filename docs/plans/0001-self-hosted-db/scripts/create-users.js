const users = [
  { user: 'orfarchiv_rw', env: 'ORFARCHIV_RW_PASSWORD', role: 'readWrite' },
  { user: 'orfarchiv_ro', env: 'ORFARCHIV_RO_PASSWORD', role: 'read' },
];

const admin = db.getSiblingDB('admin');

for (const { user, env, role } of users) {
  const pwd = process.env[env];
  if (!pwd) throw new Error(`${env} is not set`);

  const roles = [{ role, db: 'orfarchiv' }];
  if (admin.getUser(user)) {
    admin.updateUser(user, { pwd, roles });
    print(`updated ${user} (${role}@orfarchiv)`);
  } else {
    admin.createUser({ user, pwd, roles });
    print(`created ${user} (${role}@orfarchiv)`);
  }
}
