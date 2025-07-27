import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export async function GET(request: NextRequest, { params }: { params: { traceId: string } }) {
    try {
        const { traceId } = await params
        const logFile = path.join(process.cwd(), '../playground/logs', `${traceId}.log`)
        if (!fs.existsSync(logFile)) {
            return NextResponse.json({ error: 'Log file not found' }, { status: 404 })
        }
        const logContent = fs.readFileSync(logFile, 'utf8')
        return NextResponse.json({ content: logContent }, { status: 200 })
    } catch (error) {
        console.error('Error reading messages:', error)
        return NextResponse.json({ error: 'Failed to read messages' }, { status: 500 })
    }
}