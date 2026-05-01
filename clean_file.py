with open('app/customers/page.tsx', 'rb') as f:
    data = f.read()

# Replace the specific bad sequence found: \xd9 followed by space
# In the binary output it was \xd9 followed by multiple spaces.
# Let's just remove any \xd9 that is not followed by a valid continuation byte.
def clean_utf8(b):
    try:
        b.decode('utf-8')
        return b
    except UnicodeDecodeError as e:
        # e.start is the position of the bad byte
        # Replace it with a space and recurse
        return clean_utf8(b[:e.start] + b' ' + b[e.start+1:])

cleaned = clean_utf8(data)
with open('app/customers/page.tsx', 'wb') as f:
    f.write(cleaned)
print("Cleaned successfully")
