import sys
try:
    with open('app/customers/page.tsx', 'rb') as f:
        data = f.read()
    data.decode('utf-8')
    print("OK")
except UnicodeDecodeError as e:
    print(f"Error at {e.start}: {e.reason}")
    start = max(0, e.start - 20)
    end = min(len(data), e.start + 20)
    print(f"Bytes around: {data[start:end]}")
    # Also find which line it is
    line_number = data[:e.start].count(b'\n') + 1
    print(f"Line number: {line_number}")
