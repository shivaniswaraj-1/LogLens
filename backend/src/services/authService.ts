import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { signToken } from '../utils/jwt';
import { LoginInput, RegisterInput } from '../validators/authValidators';

const SALT_ROUNDS = 10;

// A precomputed hash of a value nobody will ever type, used so that a
// login attempt for a non-existent email still pays the same bcrypt cost as
// a real one. Without this, responding immediately when the user isn't
// found (skipping bcrypt entirely) makes the response time itself leak
// whether an email is registered — a timing side-channel for user
// enumeration.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('loglens-timing-defense-placeholder', SALT_ROUNDS);

function toPublicUser(user: { id: string; email: string; name: string; role: string }) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { email: input.email, passwordHash, name: input.name },
  });

  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  return { user: toPublicUser(user), token };
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const passwordMatches = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

  if (!user || !passwordMatches) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  return { user: toPublicUser(user), token };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return toPublicUser(user);
}
