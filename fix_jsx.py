path = r'c:\Users\iroub\OneDrive\Desktop\makhzoun\app\orders\new\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Find the broken line (starts with ="text-[10px])
broken_start = None
for i, line in enumerate(lines):
    if line.strip().startswith('="text-[10px] font-bold'):
        broken_start = i
        print(f"Found broken line at index {i} (line {i+1}): {repr(line[:80])}")
        break

if broken_start is None:
    print("ERROR: Could not find broken line. Dumping lines 1148-1165:")
    for i in range(1147, min(1165, len(lines))):
        print(f"  {i+1}: {repr(lines[i][:100])}")
else:
    # start_idx = one line before broken (the whitespace line)
    start_idx = broken_start - 1

    # Find the line with currentStep === 5 after broken
    end_idx = None
    for i in range(broken_start, len(lines)):
        if 'currentStep === 5' in lines[i]:
            end_idx = i
            print(f"Found end marker (currentStep===5) at index {i} (line {i+1})")
            break

    if end_idx is None:
        print("ERROR: Could not find end marker. Dumping lines from broken_start:")
        for i in range(broken_start, min(broken_start+20, len(lines))):
            print(f"  {i+1}: {repr(lines[i][:100])}")
    else:
        replacement = [
            '\n',
            '                                                      <div className="flex flex-col items-center md:items-end w-full md:w-auto">\n',
            '                                                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">\u0625\u062c\u0645\u0627\u0644\u064a \u0645\u0628\u0644\u063a \u0627\u0644\u0634\u0631\u0627\u0621</span>\n',
            '                                                          <div className="text-4xl font-black text-blue-600 font-sans tracking-tight leading-none">\n',
            '                                                              {formatWithSpaces(grandTotal)} <span className="text-base">\u062f\u062c</span>\n',
            '                                                          </div>\n',
            '                                                      </div>\n',
            '                                                  </div>\n',
            '                                              </>\n',
            '                                          );\n',
            '                                      })()}\n',
            '\n',
        ]
        new_lines = lines[:start_idx] + replacement + lines[end_idx:]
        with open(path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        print(f"SUCCESS! New total lines: {len(new_lines)}")
