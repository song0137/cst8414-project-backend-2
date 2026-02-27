import { loginSchema, registerSchema } from '../src/modules/auth/auth.schemas';

describe('POC auth schemas', () => {
  it('accepts non-email username and one-character password for login', () => {
    const parsed = loginSchema.safeParse({ username: 'xiao_song', password: '1' });
    expect(parsed.success).toBe(true);
  });

  it('allows register without displayName and derives from username later', () => {
    const parsed = registerSchema.safeParse({ username: 'rowan', password: 'x' });
    expect(parsed.success).toBe(true);
  });
});
