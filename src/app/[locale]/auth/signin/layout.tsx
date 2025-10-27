import { type Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
};

export default function SigninLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseHost = supabaseUrl?.replace(/^https?:\/\//, '');

  return (
    <>
      {supabaseHost && (
        <>
          {/* Preconnect to Supabase API for faster authentication */}
          <link rel="preconnect" href={`https://${supabaseHost}`} />
          <link rel="dns-prefetch" href={`https://${supabaseHost}`} />
        </>
      )}
      {children}
    </>
  );
}
