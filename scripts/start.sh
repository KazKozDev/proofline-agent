#!/bin/bash

# Start development server and open browser
echo "🚀 Starting Proofline Agent development server..."

# Start the dev server in background
npm run dev &
SERVER_PID=$!

# Wait a moment for server to start
echo "⏳ Waiting for server to start..."
sleep 3

# Open browser
echo "🌐 Opening browser..."
if command -v open &> /dev/null; then
    # macOS
    open http://localhost:5173
elif command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open http://localhost:5173
elif command -v start &> /dev/null; then
    # Windows
    start http://localhost:5173
else
    echo "Please open http://localhost:5173 in your browser"
fi

echo "✅ Server running at http://localhost:5173"
echo "💡 Press Ctrl+C to stop the server"

# Wait for server process
wait $SERVER_PID