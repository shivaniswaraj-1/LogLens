process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??=
  'postgresql://postgres:loglens_dev_postgres@localhost:5432/loglens_test?schema=public';
process.env.JWT_SECRET ??= 'test-secret';

// Every test file wipes all tables in beforeEach. If DATABASE_URL was already
// set in the shell (e.g. a production URL exported for a migration), the
// default above wouldn't apply and the suite would delete real data. Refuse
// to run unless the target database name clearly marks it as a test DB.
const dbName = new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '');
if (!dbName.endsWith('_test')) {
  throw new Error(
    `Refusing to run tests against database "${dbName}": its name must end in "_test". ` +
      'Unset DATABASE_URL or point it at a dedicated test database.',
  );
}
