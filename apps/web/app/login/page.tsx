import type { Metadata } from 'next';
import { AuthTemplate } from '@/app/components/templates/auth-template';
import { Card } from '@/app/components/atoms/card';
import { TextLink } from '@/app/components/atoms/text-link';
import { LoginForm } from '@/app/components/organisms/login-form';

export const metadata: Metadata = {
  title: 'Sign in | OperoERP',
};

export default function LoginPage() {
  // ponytail: placeholder footer links, wire to real pages when they exist
  return (
    <AuthTemplate
      footer={
        <>
          <TextLink href="/privacy">Privacy Policy</TextLink>
          <TextLink href="/terms">Terms of Service</TextLink>
          <TextLink href="mailto:support@opero.erp">Contact Support</TextLink>
        </>
      }
    >
      <Card className="p-8">
        <div className="mb-6 text-center">
          <span className="text-2xl font-bold tracking-tight text-foreground">
            Opero<span className="text-primary">ERP</span>
          </span>
        </div>
        <h1 className="text-headline-md mb-2 text-foreground">
          Sign in to your account
        </h1>
        <p className="text-body-md mb-6 text-muted-foreground">
          Enter your work email and password to continue
        </p>
        <LoginForm />
      </Card>
    </AuthTemplate>
  );
}
