import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

interface Props {
  children: string;
  className?: string;
}

const components: Components = {
  p: ({ children }) => <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="text-cyan font-semibold font-mono">{children}</strong>,
  em: ({ children }) => <em className="text-paper/70">{children}</em>,
  h1: ({ children }) => <p className="text-paper font-semibold mt-3 mb-1.5 first:mt-0">{children}</p>,
  h2: ({ children }) => <p className="text-paper font-semibold mt-3 mb-1.5 first:mt-0">{children}</p>,
  h3: ({ children }) => <p className="text-paper font-semibold mt-3 mb-1.5 first:mt-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-4 mb-2.5 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2.5 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  code: ({ children }) => <code className="bg-panel-raised px-1.5 py-0.5 rounded-md border border-line/50 text-cyan-soft font-mono text-[0.9em]">{children}</code>,
  hr: () => <hr className="border-line/50 my-3" />,
};

export const MarkdownText = ({ children, className }: Props) => (
  <div className={className}>
    <ReactMarkdown components={components}>{children}</ReactMarkdown>
  </div>
);
