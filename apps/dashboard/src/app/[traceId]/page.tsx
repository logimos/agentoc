import { Suspense } from "react";

async function getTraceData(traceId: string) {
    try {
        // For server-side requests in Next.js 15, we need to construct the full URL
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const host = process.env.VERCEL_URL || process.env.HOSTNAME || 'localhost:3000';
        const baseUrl = `${protocol}://${host}`;

        const [logsRes, memoryRes] = await Promise.all([
            fetch(`${baseUrl}/api/traces/${traceId}/messages`, {
                next: { revalidate: 10 }
            }),
            fetch(`${baseUrl}/api/traces/${traceId}/memory`, {
                next: { revalidate: 10 }
            })
        ]);

        let logs = '';
        let memory = null;
        let error = '';

        if (logsRes.ok) {
            const logsData = await logsRes.json();
            logs = logsData.content || '';
        } else {
            error = 'Failed to load messages';
        }

        if (memoryRes.ok) {
            memory = await memoryRes.json();
        } else if (!error) {
            error = 'Failed to load memory';
        }

        return { logs, memory, error };
    } catch (err) {
        console.error('Error fetching trace data:', err);
        return { logs: '', memory: null, error: 'Failed to load trace data' };
    }
}

export default async function TracePage({ params }: { params: { traceId: string } }) {
    const { logs, memory, error } = await getTraceData(params.traceId);

    if (error) {
        return (
            <main className="p-4">
                <Suspense fallback={<div>Loading...</div>}>
                    <h1 className="text-xl font-bold">Trace {params.traceId}</h1>
                </Suspense>
                <p className="text-red-600">{error}</p>
            </main>
        );
    }

    return (
        <main className="p-4">
            <h1 className="text-xl font-bold">Trace {params.traceId}</h1>
            <h2 className="text-lg mt-4">Messages</h2>
            <pre className="bg-gray-100 p-2 overflow-x-auto">{logs}</pre>
            <h2 className="text-lg mt-4">Memory</h2>
            <pre className="bg-gray-100 p-2 overflow-x-auto">{JSON.stringify(memory, null, 2)}</pre>
        </main>
    );
}