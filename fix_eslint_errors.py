#!/usr/bin/env python3
"""
Automated ESLint Error Fixer
Systematically fixes:
1. Unused variables (prefix with _)
2. Explicit any types (replace with unknown)
3. Empty object types (replace with unknown)
"""

import re
import sys
from pathlib import Path

def read_file(file_path):
    """Read file content."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return None

def write_file(file_path, content):
    """Write file content."""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    except Exception as e:
        print(f"Error writing {file_path}: {e}")
        return False

def fix_unused_request_param(content, line_num):
    """Fix unused request parameter by prefixing with _"""
    lines = content.split('\n')
    if 0 <= line_num - 1 < len(lines):
        line = lines[line_num - 1]
        # Match various request parameter patterns
        patterns = [
            (r'\brequest\s*:', r'_request:'),
            (r'\brequest\s*\)', r'_request)'),
            (r'\brequest\s*,', r'_request,'),
        ]
        for pattern, replacement in patterns:
            if re.search(pattern, line):
                lines[line_num - 1] = re.sub(pattern, replacement, line)
                break
    return '\n'.join(lines)

def fix_unused_var(content, line_num, var_name):
    """Fix unused variable by prefixing with _"""
    lines = content.split('\n')
    if 0 <= line_num - 1 < len(lines):
        line = lines[line_num - 1]
        # Match: const varName, let varName, varName =, {varName} =, etc.
        patterns = [
            (rf'\bconst\s+{var_name}\b', f'const _{var_name}'),
            (rf'\blet\s+{var_name}\b', f'let _{var_name}'),
            (rf'\b{var_name}\s*:', f'_{var_name}:'),
            (rf'\b{var_name}\s*\)', f'_{var_name})'),
            (rf'\b{var_name}\s*,', f'_{var_name},'),
            (rf'=\s*{var_name}\b', f'= _{var_name}'),
        ]
        for pattern, replacement in patterns:
            if re.search(pattern, line):
                lines[line_num - 1] = re.sub(pattern, replacement, line, count=1)
                break
    return '\n'.join(lines)

def fix_explicit_any(content, line_num):
    """Fix explicit any by replacing with unknown"""
    lines = content.split('\n')
    if 0 <= line_num - 1 < len(lines):
        line = lines[line_num - 1]
        # Replace : any with : unknown
        line = re.sub(r':\s*any\b', ': unknown', line)
        # Replace <any> with <unknown>
        line = re.sub(r'<any>', '<unknown>', line)
        # Replace as any with as unknown
        line = re.sub(r'\bas\s+any\b', 'as unknown', line)
        lines[line_num - 1] = line
    return '\n'.join(lines)

def fix_empty_object_type(content, line_num):
    """Fix empty object type by replacing {} with unknown"""
    lines = content.split('\n')
    if 0 <= line_num - 1 < len(lines):
        line = lines[line_num - 1]
        # Replace {  } with unknown in type annotations
        line = re.sub(r':\s*\{\s*\}', ': unknown', line)
        # Replace <{}> with <unknown>
        line = re.sub(r'<\{\s*\}>', '<unknown>', line)
        lines[line_num - 1] = line
    return '\n'.join(lines)

def remove_unused_import(content, line_num, import_name):
    """Remove unused import"""
    lines = content.split('\n')
    if 0 <= line_num - 1 < len(lines):
        line = lines[line_num - 1]
        # Check if it's a single import
        if re.match(rf'import\s+\{{\s*{import_name}\s*\}}', line):
            # Remove the entire line if it's the only import
            lines[line_num - 1] = ''
        else:
            # Remove from destructured import
            line = re.sub(rf',?\s*{import_name}\s*,?', '', line)
            # Clean up double commas
            line = re.sub(r',\s*,', ',', line)
            # Clean up trailing/leading commas in braces
            line = re.sub(r'\{\s*,', '{', line)
            line = re.sub(r',\s*\}', '}', line)
            lines[line_num - 1] = line
    return '\n'.join(lines)

def main():
    """Main function to process all files."""
    base_dir = Path('/Users/tomergalansky/Desktop/loom-app')

    # Files to fix with their errors
    fixes = [
        # Format: (file, line, type, detail)
        ('src/app/api/admin/maintenance/route.ts', 156, 'unused_param', 'request'),
        ('src/app/api/admin/system-health/route.ts', 84, 'unused_var', 'data'),
        ('src/app/api/admin/system-health/route.ts', 212, 'unused_var', 'data'),
        ('src/app/api/admin/system-health/route.ts', 226, 'unused_var', 'data'),
        ('src/app/api/admin/system-health/route.ts', 240, 'unused_var', 'data'),
        ('src/app/api/admin/system-health/route.ts', 251, 'unused_param', 'request'),
        ('src/app/api/admin/system-health/route.ts', 258, 'unused_param', 'request'),
        ('src/app/api/admin/system-health/route.ts', 265, 'unused_param', 'request'),
    ]

    files_processed = set()

    for file_path, line_num, fix_type, detail in fixes:
        full_path = base_dir / file_path
        if not full_path.exists():
            print(f"File not found: {full_path}")
            continue

        content = read_file(full_path)
        if content is None:
            continue

        print(f"Fixing {file_path}:{line_num} ({fix_type}: {detail})")

        if fix_type == 'unused_param':
            content = fix_unused_request_param(content, line_num)
        elif fix_type == 'unused_var':
            content = fix_unused_var(content, line_num, detail)
        elif fix_type == 'explicit_any':
            content = fix_explicit_any(content, line_num)
        elif fix_type == 'empty_object':
            content = fix_empty_object_type(content, line_num)
        elif fix_type == 'unused_import':
            content = remove_unused_import(content, line_num, detail)

        if write_file(full_path, content):
            files_processed.add(file_path)

    print(f"\nProcessed {len(files_processed)} files")
    for file in sorted(files_processed):
        print(f"  - {file}")

if __name__ == '__main__':
    main()
