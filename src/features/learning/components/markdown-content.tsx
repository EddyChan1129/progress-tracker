import { CodeBlock } from "./code-block";
import ReactMarkdown from "react-markdown";

import {
  allowedMarkdownElements,
  markdownUrlTransform,
} from "@/features/learning/markdown";

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="space-y-3 break-words text-sm leading-6 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-sm [&_pre]:whitespace-pre [&_ul]:list-disc [&_ul]:pl-6">
      <ReactMarkdown
        allowedElements={allowedMarkdownElements}
        components={{
          pre({ node, children }) {
            const codeNode = node?.children[0];
            if (codeNode?.type !== "element" || codeNode.tagName !== "code")
              return <pre>{children}</pre>;
            const code = codeNode.children
              .map((child) => (child.type === "text" ? child.value : ""))
              .join("");
            const classes = codeNode.properties.className;
            const language = Array.isArray(classes)
              ? String(
                  classes.find((name) =>
                    String(name).startsWith("language-"),
                  ) ?? "",
                ).replace(/^language-/, "")
              : "";
            return <CodeBlock code={code} language={language} />;
          },
          a({ children, href, title }) {
            if (!href) return <span>{children}</span>;

            return (
              <a
                className="text-primary underline underline-offset-4"
                href={href}
                rel="noreferrer"
                target="_blank"
                title={title}
              >
                {children}
              </a>
            );
          },
        }}
        skipHtml
        urlTransform={markdownUrlTransform}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
