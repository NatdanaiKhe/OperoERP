import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { WelcomeEmailDto } from './welcome-email.dto';

describe('WelcomeEmailDto', () => {
  const valid = {
    companyName: 'OperoERP',
    name: 'Jane Doe',
    email: 'jane@example.com',
    inviteUrl: 'http://localhost:3000/auth/accept-invite?token=abc',
  };

  it('passes with valid data including localhost URL', async () => {
    const dto = plainToInstance(WelcomeEmailDto, valid);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails when name is missing', async () => {
    const dto = plainToInstance(WelcomeEmailDto, { ...valid, name: undefined });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when email is invalid', async () => {
    const dto = plainToInstance(WelcomeEmailDto, {
      ...valid,
      email: 'not-an-email',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when inviteUrl is not a valid URL', async () => {
    const dto = plainToInstance(WelcomeEmailDto, {
      ...valid,
      inviteUrl: 'not a url',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
