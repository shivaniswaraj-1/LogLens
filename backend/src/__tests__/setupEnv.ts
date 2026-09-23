process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??=
  'postgresql://postgres:loglens_dev_postgres@localhost:5432/loglens_test?schema=public';
process.env.JWT_SECRET ??= 'test-secret';
