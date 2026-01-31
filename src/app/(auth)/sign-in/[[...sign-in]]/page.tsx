import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl text-brand-purple tracking-wider">ADVENTII</h1>
          <p className="text-gray-600 mt-2">Sign in to access the Client Portal</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-lg border border-gray-200 rounded-xl',
              headerTitle: 'text-gray-900',
              headerSubtitle: 'text-gray-600',
              formButtonPrimary:
                'bg-brand-purple hover:bg-brand-purple-light text-white',
              footerActionLink: 'text-brand-purple hover:text-brand-purple-light',
            },
          }}
        />
      </div>
    </div>
  );
}
