export interface ParsedStudentRow {
  index: number;
  rawText: string;
  studentId: string;
  fullName: string;
  isValid: boolean;
  error?: string;
  isDuplicate?: boolean;
}

export interface StudentParseResult {
  totalRows: number;
  validRows: ParsedStudentRow[];
  invalidRows: ParsedStudentRow[];
  duplicateCount: number;
  validCount: number;
  students: Array<{ studentId: string; fullName: string }>;
}

/**
 * Parses raw text copied directly from Google Sheets / Excel.
 * Format expected:
 * Student ID <TAB> Full Name
 * Also handles comma-separated, semicolon-separated, or flexible whitespace rows.
 */
export function parseStudentList(rawText: string): StudentParseResult {
  const lines = rawText.split(/\r?\n/);
  const validRows: ParsedStudentRow[] = [];
  const invalidRows: ParsedStudentRow[] = [];
  const seenIds = new Set<string>();
  let duplicateCount = 0;
  let rowIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue; // ignore blank lines

    rowIndex++;
    let studentId = '';
    let fullName = '';

    // Check for Tab delimiter (standard from Google Sheets / Excel copy)
    if (lines[i].includes('\t')) {
      const parts = lines[i].split('\t').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        studentId = parts[0];
        fullName = parts.slice(1).join(' ');
      } else if (parts.length === 1) {
        studentId = parts[0];
      }
    } 
    // Check for Comma delimiter
    else if (rawLine.includes(',')) {
      const parts = rawLine.split(',').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        studentId = parts[0];
        fullName = parts.slice(1).join(' ');
      } else if (parts.length === 1) {
        studentId = parts[0];
      }
    }
    // Fallback: split by 2 or more spaces or first whitespace token
    else {
      const multiSpaceMatch = rawLine.match(/^(\S+)\s{2,}(.+)$/);
      if (multiSpaceMatch) {
        studentId = multiSpaceMatch[1].trim();
        fullName = multiSpaceMatch[2].trim();
      } else {
        const firstSpaceIndex = rawLine.indexOf(' ');
        if (firstSpaceIndex !== -1) {
          studentId = rawLine.substring(0, firstSpaceIndex).trim();
          fullName = rawLine.substring(firstSpaceIndex + 1).trim();
        } else {
          studentId = rawLine;
        }
      }
    }

    // Clean up potential header row
    if (studentId.toLowerCase() === 'student id' || studentId.toLowerCase() === 'id' || studentId.toLowerCase() === 'student_id') {
      continue;
    }

    const rowObj: ParsedStudentRow = {
      index: rowIndex,
      rawText: rawLine,
      studentId,
      fullName,
      isValid: false
    };

    if (!studentId && !fullName) {
      continue;
    } else if (!studentId) {
      rowObj.error = 'Missing Student ID';
      invalidRows.push(rowObj);
    } else if (!fullName) {
      rowObj.error = 'Missing Full Name';
      invalidRows.push(rowObj);
    } else if (seenIds.has(studentId.toLowerCase())) {
      rowObj.error = 'Duplicate Student ID';
      rowObj.isDuplicate = true;
      duplicateCount++;
      invalidRows.push(rowObj);
    } else {
      rowObj.isValid = true;
      seenIds.add(studentId.toLowerCase());
      validRows.push(rowObj);
    }
  }

  return {
    totalRows: rowIndex,
    validRows,
    invalidRows,
    duplicateCount,
    validCount: validRows.length,
    students: validRows.map(r => ({
      studentId: r.studentId,
      fullName: r.fullName
    }))
  };
}
