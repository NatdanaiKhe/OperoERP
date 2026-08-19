import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ResetEmailDto } from './reset-email.dto';

describe('ResetEmailDto', () => {
  const valid = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    resetUrl: 'http://localhost:3000/auth/reset-password?token=xyz',
  };

  it('passes with valid data including localhost URL', async () => {
    const dto = plainToInstance(ResetEmailDto, valid);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails when name is missing', async () => {
    const dto = plainToInstance(ResetEmailDto, { ...valid, name: undefined });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when email is invalid', async () => {
    const dto = plainToInstance(ResetEmailDto, {
      ...valid,
      email: 'not-an-email',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
