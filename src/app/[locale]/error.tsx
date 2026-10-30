'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/primitives';
import { ErrorState } from '@/components/ui/states';

/**
 * Route error boundary.
 *
 * The API can fail in several ways — timeout, 5xx, an HTML page where JSON was
 * expected, or a schema change. None of them should show a stack trace. The
 * reader gets a plain sentence and a retry; the detail is in the server log,
 * which carries no secrets or PII.
 *
 * Wording is tri-lingual because an error boundary is a Client Component and
 * cannot reach the server-side translator.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({ level: 'error', source: 'route', digest: error.digest })
    );
  }, [error]);

  return (
    <Container size="prose" className="py-16">
      <ErrorState
        title="Could not load this page · بارگذاری این صفحه انجام نشد · بارکردنی ئەم لاپەڕەیە سەرکەوتوو نەبوو"
        body="Check your connection and try again."
        action={
          <Button onClick={reset} size="md">
            Retry · تلاش دوباره · دووبارە هەوڵ بدە
          </Button>
        }
      />
    </Container>
  );
}
