import bcrypt from 'bcryptjs';

const SALT_ROUNDS = process.env.SALT_ROUNDS ? parseInt(process.env.SALT_ROUNDS) : 12;

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string,hash: string): Promise<boolean>{
  return await bcrypt.compare(password, hash);
}