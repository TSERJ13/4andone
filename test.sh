URL="https://qnelhtjjrvmcjvbkzcmx.supabase.co/rest/v1/styles"
KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZWxodGpqcnZtY2p2Ymt6Y214Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDk4ODEsImV4cCI6MjA5MDk4NTg4MX0.O8KIsB3a_c8uH_B3c8uH_B3c8uH_B3c8uH_B3c8uH_B3c8uH_B3c8uH_B3c8uH_B3c8uH_B3c8uH_B3"
curl -s -X POST "$URL" \
-H "apikey: $KEY" \
-H "Authorization: Bearer $KEY" \
-H "Content-Type: application/json" \
-H "Prefer: return=representation" \
-d '{"title": "CurlTest", "color": "#000", "program": "Latin", "order": 99}'
