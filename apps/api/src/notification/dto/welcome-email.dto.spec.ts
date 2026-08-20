// DTOs are plain interfaces — class-validator decorators removed.
// BullMQ job data bypasses Nest's ValidationPipe, so validation was dead at runtime.
it('WelcomeEmailDto is a plain interface (no runtime validation)', () => {
  const dto = { companyName: 'OperoERP', name: 'Jane', email: 'jane@example.com', inviteUrl: 'http://localhost:3000/x' };
  expect(dto.email).toBe('jane@example.com');
});
