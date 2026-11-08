(function (root) {
  "use strict";
  function normalized(rect, page) {
    return { xStart: (rect.left - page.left) / page.width, xEnd: (rect.right - page.left) / page.width,
      yStart: (rect.top - page.top) / page.height, yEnd: (rect.bottom - page.top) / page.height };
  }
  function capture(range, spans, page) {
    var segments = [];
    spans.forEach(function (span) {
      if (!range.intersectsNode(span)) return;
      var full = document.createRange(); full.selectNodeContents(span);
      var part = full.cloneRange();
      if (range.compareBoundaryPoints(0, full) > 0) part.setStart(range.startContainer, range.startOffset);
      if (range.compareBoundaryPoints(2, full) < 0) part.setEnd(range.endContainer, range.endOffset);
      var chosen = part.toString();
      if (!chosen.trim()) return;
      var before = full.cloneRange(); before.setEnd(part.startContainer, part.startOffset);
      var start = before.toString().length, text = span.textContent || "", end = start + chosen.length;
      var box = part.getBoundingClientRect();
      if (!box.width || !box.height) return;
      segments.push(Object.assign(normalized(box, page), {
        text: chosen, prefix: text.slice(0, start), suffix: text.slice(end), whole: start === 0 && end === text.length,
        numeric: /^\d+$/.test(chosen.trim()) && !/\d$/.test(text.slice(0, start)) && !/^\d/.test(text.slice(end))
      }));
    });
    return segments.length ? { text: range.toString().replace(/\s+/g, " ").trim(), segments: segments } : null;
  }
  function readEntries(layer, spans) {
    var page = layer.getBoundingClientRect();
    return spans.map(function (span) {
      var chars = [], offset = 0;
      var walker = document.createTreeWalker(span, 4), node;
      while ((node = walker.nextNode())) {
        var local = 0;
        Array.from(node.textContent || "").forEach(function (char) {
          var range = document.createRange(); range.setStart(node, local); range.setEnd(node, local + char.length);
          var rect = range.getBoundingClientRect();
          chars.push(Object.assign(normalized(rect, page), { text: char, start: offset + local, end: offset + local + char.length }));
          local += char.length;
        });
        offset += local;
      }
      return { text: span.textContent || "", chars: chars };
    });
  }
  function extractEntries(entries, anchor) {
    var parts = [];
    entries.forEach(function (entry) {
      if (!entry.chars.length) return;
      var intervals = [];
      anchor.segments.forEach(function (segment) {
        var selected = entry.chars.filter(function (c) {
          var x = (c.xStart + c.xEnd) / 2, y = (c.yStart + c.yEnd) / 2;
          return c.xEnd > c.xStart && x >= segment.xStart - 0.0001 && x <= segment.xEnd + 0.0001 && y >= segment.yStart && y <= segment.yEnd;
        });
        if (!selected.length) return;
        var start = selected[0].start, end = selected[selected.length - 1].end, text = entry.text;
        // Stable label delimiters survive proportional fonts and different value lengths.
        if (segment.prefix && text.indexOf(segment.prefix) === 0 && (!segment.suffix || text.endsWith(segment.suffix))) {
          var candidateStart = segment.prefix.length, candidateEnd = text.length - segment.suffix.length;
          var candidate = text.slice(candidateStart, candidateEnd);
          if (!segment.numeric || /^\d+$/.test(candidate.trim())) { start = candidateStart; end = candidateEnd; }
        } else if (segment.numeric) {
          // Expand a complete number, never its neighbouring label or punctuation.
          var digits = selected.filter(function (c) { return /^\d$/.test(c.text); });
          if (!digits.length) return;
          start = digits[0].start; end = digits[digits.length - 1].end;
          while (start > 0 && /\d/.test(text[start - 1])) start--;
          while (end < text.length && /\d/.test(text[end])) end++;
        } else if (segment.whole && !/[:=]/.test(text)) {
          start = 0; end = text.length;
        }
        if (end > start) intervals.push([start, end]);
      });
      intervals.sort(function (a,b) { return a[0]-b[0]; });
      var merged = [];
      intervals.forEach(function (interval) {
        var last = merged[merged.length-1];
        if (last && interval[0] <= last[1]) last[1] = Math.max(last[1], interval[1]); else merged.push(interval.slice());
      });
      merged.forEach(function (interval) { parts.push(entry.text.slice(interval[0], interval[1])); });
    });
    return parts.join(" ").replace(/\s+/g, " ").trim();
  }
  root.PdfTextSelection = { capture: capture, readEntries: readEntries, extractEntries: extractEntries };
})(typeof globalThis !== "undefined" ? globalThis : window);
