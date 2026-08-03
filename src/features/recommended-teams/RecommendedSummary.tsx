import ReactMarkdown, { defaultUrlTransform, type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

interface RecommendedSummaryProps {
  markdown: string;
}

const markdownComponents: Components = {
  h1: ({ node: _node, ...props }) => <h4 data-markdown-level="1" {...props} />,
  h2: ({ node: _node, ...props }) => <h4 data-markdown-level="2" {...props} />,
  h3: ({ node: _node, ...props }) => <h4 data-markdown-level="3" {...props} />,
  h4: ({ node: _node, ...props }) => <h4 data-markdown-level="4" {...props} />,
  h5: ({ node: _node, ...props }) => <h4 data-markdown-level="5" {...props} />,
  h6: ({ node: _node, ...props }) => <h4 data-markdown-level="6" {...props} />,
  a: ({ node: _node, href, children, ...props }) =>
    href ? (
      <a {...props} href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ) : (
      <span>{children}</span>
    ),
  table: ({ node: _node, ...props }) => (
    <div className="recommended-markdown__table" tabIndex={0}>
      <table {...props} />
    </div>
  ),
};

export function RecommendedSummary({ markdown }: RecommendedSummaryProps) {
  return (
    <div className="recommended-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
        disallowedElements={["img"]}
        skipHtml
        urlTransform={defaultUrlTransform}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
