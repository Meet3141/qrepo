"""
PDF rendering for question papers (reportlab).

Uses a Unicode TrueType font when one is available (QREPO_PDF_FONT / DejaVuSans / Arial);
otherwise falls back to Helvetica, where characters outside Latin-1 are transliterated.
Unapproved papers are watermarked. The answer key is only included when explicitly requested.
"""
import io
import os
import unicodedata
from functools import lru_cache
from typing import Optional, Tuple
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

_FONT_CANDIDATES = [
    (os.environ.get("QREPO_PDF_FONT"), os.environ.get("QREPO_PDF_FONT_BOLD")),
    ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ("/usr/share/fonts/dejavu/DejaVuSans.ttf", "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"),
    ("C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/arialbd.ttf"),
    ("/Library/Fonts/Arial Unicode.ttf", None),
]
_ASCII_FALLBACKS = {"≤": "<=", "≥": ">=", "≠": "!=", "→": "->", "←": "<-", "×": "x", "−": "-", "–": "-", "—": "-",
                    "‘": "'", "’": "'", "“": '"', "”": '"', "…": "...", "•": "*", "√": "sqrt", "∞": "inf"}


@lru_cache(maxsize=1)
def _fonts() -> Tuple[str, str, bool]:
    """(regular, bold, unicode_capable)"""
    for regular, bold in _FONT_CANDIDATES:
        if regular and os.path.exists(regular):
            try:
                pdfmetrics.registerFont(TTFont("QRepoSans", regular))
                bold_name = "QRepoSans"
                if bold and os.path.exists(bold):
                    pdfmetrics.registerFont(TTFont("QRepoSans-Bold", bold))
                    bold_name = "QRepoSans-Bold"
                return "QRepoSans", bold_name, True
            except Exception:  # unreadable/corrupt font file: try the next one
                continue
    return "Helvetica", "Helvetica-Bold", False


@lru_cache(maxsize=1)
def _glyphs() -> frozenset:
    regular, _, unicode_capable = _fonts()
    if not unicode_capable:
        return frozenset()
    return frozenset(pdfmetrics.getFont(regular).face.charToGlyph)


def _renderable(ch: str) -> str:
    """Characters the font lacks fall back to their compatibility form (e.g. subscript 2 -> 2)."""
    if ord(ch) < 128 or ord(ch) in _glyphs():
        return ch
    folded = unicodedata.normalize("NFKC", ch)
    return folded if all(ord(c) in _glyphs() or ord(c) < 128 for c in folded) else _ASCII_FALLBACKS.get(ch, "?")


def _text(value: Optional[str]) -> str:
    """Escape for reportlab's mini-markup and make safe for the active font."""
    value = value or ""
    if _fonts()[2]:
        value = "".join(_renderable(ch) for ch in value)
    else:
        value = "".join(_ASCII_FALLBACKS.get(ch, ch) for ch in value)
        value = unicodedata.normalize("NFKD", value).encode("latin-1", "replace").decode("latin-1")
    return escape(value).replace("\n", "<br/>")


def _styles():
    regular, bold, _ = _fonts()
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("t", parent=base["Title"], fontName=bold, fontSize=16, leading=20, spaceAfter=4),
        "subtitle": ParagraphStyle("s", parent=base["Normal"], fontName=regular, fontSize=10, alignment=TA_CENTER,
                                   textColor=colors.HexColor("#444444")),
        "h": ParagraphStyle("h", parent=base["Heading3"], fontName=bold, fontSize=11, spaceBefore=8, spaceAfter=4),
        "body": ParagraphStyle("b", parent=base["Normal"], fontName=regular, fontSize=10.5, leading=14),
        "option": ParagraphStyle("o", parent=base["Normal"], fontName=regular, fontSize=10, leading=13, leftIndent=8 * mm),
        "small": ParagraphStyle("sm", parent=base["Normal"], fontName=regular, fontSize=8.5, leading=11,
                                textColor=colors.HexColor("#555555")),
    }


def render_paper_pdf(paper, subject, include_answers: bool = False) -> bytes:
    regular, bold, _ = _fonts()
    st = _styles()
    approved = paper.status == "APPROVED"
    buffer = io.BytesIO()

    def decorate(canvas, doc):
        canvas.saveState()
        canvas.setFont(regular, 8)
        canvas.setFillColor(colors.HexColor("#777777"))
        canvas.drawString(15 * mm, 10 * mm, f"{subject.code} - {paper.title[:80]}")
        canvas.drawRightString(A4[0] - 15 * mm, 10 * mm, f"Page {doc.page}")
        if not approved:
            canvas.setFont(bold, 46)
            canvas.setFillColor(colors.Color(0.85, 0.1, 0.1, alpha=0.12))
            canvas.translate(A4[0] / 2, A4[1] / 2)
            canvas.rotate(40)
            canvas.drawCentredString(0, 0, "DRAFT - NOT APPROVED")
        canvas.restoreState()

    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm,
                            bottomMargin=18 * mm, title=paper.title, author="QRepo")
    total_marks = round(sum(q.marks for q in paper.questions), 2)
    story = [
        Paragraph(_text(f"{subject.code} - {subject.name}"), st["subtitle"]),
        Paragraph(_text(paper.title), st["title"]),
        Paragraph(_text(f"{paper.exam_type}  |  Duration: {paper.duration_minutes} minutes  |  "
                        f"Maximum marks: {total_marks:g}"), st["subtitle"]),
        Spacer(1, 6 * mm),
    ]
    if paper.instructions:
        story += [Paragraph("Instructions", st["h"]), Paragraph(_text(paper.instructions), st["body"]), Spacer(1, 4 * mm)]

    for q in paper.questions:
        number_cell = Paragraph(f"<b>Q{q.position}.</b>", st["body"])
        text_cell = [Paragraph(_text(q.question_text), st["body"])]
        if q.options:
            for i, option in enumerate(q.options):
                text_cell.append(Paragraph(f"({chr(65 + i)}) {_text(option)}", st["option"]))
        marks_cell = Paragraph(f"[{q.marks:g}]", st["body"])
        table = Table([[number_cell, text_cell, marks_cell]], colWidths=[12 * mm, None, 14 * mm])
        table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0),
                                   ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
        story.append(KeepTogether(table))

    if include_answers:
        story += [PageBreak(), Paragraph("Answer Key (confidential - staff only)", st["title"]), Spacer(1, 4 * mm)]
        for q in paper.questions:
            parts = [f"<b>Q{q.position}.</b> "]
            if q.options and q.correct_option_index is not None and 0 <= q.correct_option_index < len(q.options):
                parts.append(f"({chr(65 + q.correct_option_index)}) {_text(q.options[q.correct_option_index])}")
            elif q.expected_answer:
                parts.append(_text(q.expected_answer))
            story.append(Paragraph("".join(parts), st["body"]))
            if q.explanation:
                story.append(Paragraph(_text(q.explanation), st["small"]))
            story.append(Spacer(1, 2 * mm))

    doc.build(story, onFirstPage=decorate, onLaterPages=decorate)
    return buffer.getvalue()
