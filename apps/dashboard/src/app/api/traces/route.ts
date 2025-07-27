import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
    try {
        // Path to logs in the playground app
        const logDir = path.join(process.cwd(), '../playground/logs')
        console.log('logDir', logDir)

        if (!fs.existsSync(logDir)) {
            return NextResponse.json([], { status: 200 })
        }

        const files = fs.readdirSync(logDir).filter(f => f.endsWith('.log'))
        const traces = files.map(f => f.replace('.log', ''))
        return NextResponse.json(traces, { status: 200 })
    } catch (error) {
        console.error('Error reading traces:', error)
        return NextResponse.json({ error: 'Failed to read traces' }, { status: 500 })
    }
}