import csv
import io
from typing import Iterable, Sequence
from fastapi.responses import Response

# Cells starting with these are executed as formulas by Excel/Sheets (CSV injection)
_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def _safe(value) -> str:
    text = "" if value is None else str(value)
    return "'" + text if text.startswith(_FORMULA_PREFIXES) else text


def csv_response(filename: str, header: Sequence[str], rows: Iterable[Sequence]) -> Response:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(header)
    for row in rows:
        writer.writerow([_safe(v) for v in row])
    # BOM so Excel opens UTF-8 correctly
    return Response(content="\ufeff" + buffer.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})
