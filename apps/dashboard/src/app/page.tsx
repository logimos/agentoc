export default async function Page() {
  try {
    // For server-side requests in Next.js 15, we need to construct the full URL
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = process.env.VERCEL_URL || process.env.HOSTNAME || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    const res = await fetch(`${baseUrl}/api/traces`, {
      // Add cache control for better performance
      next: { revalidate: 10 }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch traces: ${res.status}`);
    }

    const traces: string[] = await res.json();

    return (
      <main className="p-4">
        <h1 className="text-xl font-bold mb-4">Active Traces</h1>
        {traces.length === 0 ? (
          <p className="text-gray-600">No traces found</p>
        ) : (
          <ul className="space-y-2">
            {traces.map(trace => (
              <li key={trace}>
                <a href={`/${trace}`} className="text-blue-600 underline">{trace}</a>
              </li>
            ))}
          </ul>
        )}
      </main>
    );
  } catch (error) {
    console.error('Error fetching traces:', error);
    return (
      <main className="p-4">
        <h1 className="text-xl font-bold mb-4">Active Traces</h1>
        <p className="text-red-600">Failed to load traces. Please try again.</p>
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-gray-600">Error details</summary>
          <pre className="mt-1 text-xs bg-gray-100 p-2 rounded">{error instanceof Error ? error.message : String(error)}</pre>
        </details>
      </main>
    );
  }
}