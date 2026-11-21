type MarkdownProps = {
  html: string;
};

export function Markdown({ html }: MarkdownProps) {
  return <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />;
}
