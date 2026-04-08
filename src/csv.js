export async function loadCsv(path) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`CSVの取得に失敗しました: ${path}`);
  }

  const text = await res.text();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}
