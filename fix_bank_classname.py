import re

with open('app/orders/new/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the problematic multi-line template literal className
# We look for the pattern starting at the className backtick and ending at }`}
pattern = r"className=\{`px-4 py-3 rounded-xl cursor-pointer font-bold transition-all flex items-center justify-between\s*\$\{bankName === bank\s*\? 'bg-blue-600 text-white shadow-md'\s*: focusedBankIndex === bIdx && activeSubFocus === 'DETAILS'\s*\? 'bg-blue-100 text-blue-700'\s*: 'bg-white text-gray-600 hover:bg-gray-100'\}`\}"

replacement = "className={bankName === bank ? 'px-4 py-3 rounded-xl cursor-pointer font-bold transition-all flex items-center justify-between bg-blue-600 text-white shadow-md' : focusedBankIndex === bIdx && activeSubFocus === 'DETAILS' ? 'px-4 py-3 rounded-xl cursor-pointer font-bold transition-all flex items-center justify-between bg-blue-100 text-blue-700' : 'px-4 py-3 rounded-xl cursor-pointer font-bold transition-all flex items-center justify-between bg-white text-gray-600 hover:bg-gray-100'}"

new_content, count = re.subn(pattern, replacement, content, flags=re.DOTALL)

if count > 0:
    with open('app/orders/new/page.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f'SUCCESS - replaced {count} occurrence(s)')
else:
    print('NO MATCH found with regex')
    # Try to find manually
    idx = content.find("hover:bg-gray-100'}`}")
    if idx >= 0:
        print(f'Found problematic string at char {idx}')
        print(repr(content[idx-300:idx+30]))
    else:
        print('Could not locate the pattern')
