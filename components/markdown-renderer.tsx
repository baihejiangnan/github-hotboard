"use client";

import { Fragment } from "react";

function renderInline(text: string) {
  const nodes: React.ReactNode[] = [];
  const pattern =
    /(\[([^\]]+)\]\((https?:\/\/[^)]+)\))|(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\*([^*]+)\*)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[2] && match[3]) {
      nodes.push(
        <a key={`${match.index}-link`} href={match[3]} target="_blank" rel="noreferrer">
          {match[2]}
        </a>
      );
    } else if (match[5]) {
      nodes.push(<strong key={`${match.index}-bold`}>{match[5]}</strong>);
    } else if (match[7]) {
      nodes.push(<code key={`${match.index}-code`}>{match[7]}</code>);
    } else if (match[9]) {
      nodes.push(<em key={`${match.index}-italic`}>{match[9]}</em>);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

function renderParagraph(text: string, key: string) {
  return <p key={key}>{renderInline(text)}</p>;
}

export function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2];
      if (level === 1) blocks.push(<h1 key={`h1-${index}`}>{renderInline(text)}</h1>);
      if (level === 2) blocks.push(<h2 key={`h2-${index}`}>{renderInline(text)}</h2>);
      if (level === 3) blocks.push(<h3 key={`h3-${index}`}>{renderInline(text)}</h3>);
      if (level === 4) blocks.push(<h4 key={`h4-${index}`}>{renderInline(text)}</h4>);
      index += 1;
      continue;
    }

    if (/^(\[.+\]|【.+】)$/.test(trimmed)) {
      blocks.push(
        <h4 key={`section-${index}`} className="markdown-renderer__section">
          {trimmed}
        </h4>
      );
      index += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }

      blocks.push(
        <blockquote key={`quote-${index}`}>
          {quoteLines.map((quoteLine, quoteIndex) => (
            <Fragment key={`quote-line-${quoteIndex}`}>
              {renderInline(quoteLine)}
              {quoteIndex < quoteLines.length - 1 ? <br /> : null}
            </Fragment>
          ))}
        </blockquote>
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ""));
        index += 1;
      }

      blocks.push(
        <ul key={`ul-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`ul-item-${itemIndex}`}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ""));
        index += 1;
      }

      blocks.push(
        <ol key={`ol-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`ol-item-${itemIndex}`}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const current = lines[index].trim();
      if (
        !current ||
        /^(#{1,4})\s+/.test(current) ||
        /^(\[.+\]|【.+】)$/.test(current) ||
        /^>\s?/.test(current) ||
        /^[-*]\s+/.test(current) ||
        /^\d+\.\s+/.test(current)
      ) {
        break;
      }

      paragraphLines.push(current);
      index += 1;
    }

    blocks.push(renderParagraph(paragraphLines.join(" "), `p-${index}`));
  }

  return <div className="markdown-renderer">{blocks}</div>;
}
