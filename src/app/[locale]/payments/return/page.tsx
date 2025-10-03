import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';

export default async function PaymentReturnPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>,
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }
  const resolvedSearchParams = await searchParams;
  const status = (resolvedSearchParams.status as string) || 'unknown';

  const isHe = locale === 'he';

  const title = isHe ? 'תשלום' : 'Payment';
  const success = isHe ? 'התשלום הושלם בהצלחה.' : 'Your payment was successful.';
  const canceled = isHe ? 'התשלום בוטל.' : 'Payment was canceled.';
  const failed = isHe ? 'התשלום נכשל.' : 'Payment failed.';
  const unknown = isHe ? 'סטטוס תשלום לא ידוע.' : 'Unknown payment status.';

  const message = status === 'success' ? success : status === 'cancel' ? canceled : status === 'failed' ? failed : unknown;

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold mb-4">{title}</h1>
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

