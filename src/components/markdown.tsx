import React from "react";
import { View, Text, Linking, Image, ScrollView } from "react-native";
import { JSX } from "react";

interface MarkdownProps {
  children: string;
}

interface MarkdownElement {
  type: string;
  content: string;
  key: string;
  url?: string;
  number?: string;
  headers?: string[];
  rows?: string[][];
  checked?: boolean;
  indentLevel?: number;
  footnoteId?: string;
  term?: string;
}

const parseMarkdown = (text: string): MarkdownElement[] => {
  const lines = text.split("\n");
  const elements: MarkdownElement[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Tables - check if line looks like a table row
    if (
      line.trim().startsWith("|") &&
      line.trim().endsWith("|") &&
      line.includes("|")
    ) {
      // Check if this might be a table by looking ahead for separator row
      const nextLine = i + 1 < lines.length ? lines[i + 1] : "";
      if (nextLine.trim().match(/^\|[\s\-\|:]+\|$/)) {
        // This is a table! Parse it
        const headers = line
          .trim()
          .slice(1, -1) // Remove leading and trailing |
          .split("|")
          .map((h) => h.trim());

        i++; // Skip separator row
        i++; // Move to first data row

        const rows: string[][] = [];
        while (
          i < lines.length &&
          lines[i].trim().startsWith("|") &&
          lines[i].trim().endsWith("|")
        ) {
          const row = lines[i]
            .trim()
            .slice(1, -1) // Remove leading and trailing |
            .split("|")
            .map((cell) => cell.trim());
          rows.push(row);
          i++;
        }
        i--; // Back up one since the for loop will increment

        elements.push({
          type: "table",
          content: "",
          headers,
          rows,
          key: `table-${key++}`,
        });
        continue;
      }
    }

    // Headers
    if (line.startsWith("# ")) {
      elements.push({
        type: "h1",
        content: line.substring(2),
        key: `h1-${key++}`,
      });
    } else if (line.startsWith("## ")) {
      elements.push({
        type: "h2",
        content: line.substring(3),
        key: `h2-${key++}`,
      });
    } else if (line.startsWith("### ")) {
      elements.push({
        type: "h3",
        content: line.substring(4),
        key: `h3-${key++}`,
      });
    } else if (line.startsWith("#### ")) {
      elements.push({
        type: "h4",
        content: line.substring(5),
        key: `h4-${key++}`,
      });
    } else if (line.startsWith("##### ")) {
      elements.push({
        type: "h5",
        content: line.substring(6),
        key: `h5-${key++}`,
      });
    } else if (line.startsWith("###### ")) {
      elements.push({
        type: "h6",
        content: line.substring(7),
        key: `h6-${key++}`,
      });
    }
    // Code blocks
    else if (line.startsWith("```")) {
      const codeLines = [];
      i++; // Skip the opening ```
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push({
        type: "code_block",
        content: codeLines.join("\n"),
        key: `code-${key++}`,
      });
    }
    // Blockquotes
    else if (line.startsWith("> ")) {
      elements.push({
        type: "blockquote",
        content: line.substring(2),
        key: `quote-${key++}`,
      });
    }
    // Checklists (must come before regular bullet points)
    else if (line.match(/^[-*+]\s\[[ x]\]\s/)) {
      const isChecked = line.includes("[x]") || line.includes("[X]");
      const content = line.replace(/^[-*+]\s\[[ xX]\]\s/, "");
      elements.push({
        type: "checklist_item",
        content: content,
        checked: isChecked,
        key: `checklist-${key++}`,
      });
    }
    // Bullet points (unordered lists) (supports -, *, +)
    else if (/^\s*[-*+]\s/.test(line)) {
      const match = line.match(/^(\s*)[-*+]\s(.*)$/);
      if (match) {
        const indentLevel = Math.floor(match[1].length / 2); // 2 spaces = 1 indent level
        elements.push({
          type: "list_item",
          content: match[2],
          indentLevel: indentLevel,
          key: `list-${key++}`,
        });
      }
    }
    // Numbered lists
    else if (/^\s*\d+\.\s/.test(line)) {
      const match = line.match(/^(\s*)(\d+)\.\s(.*)$/);
      if (match) {
        const indentLevel = Math.floor(match[1].length / 2); // 2 spaces = 1 indent level
        elements.push({
          type: "numbered_item",
          content: match[3],
          number: match[2],
          indentLevel: indentLevel,
          key: `numbered-${key++}`,
        });
      }
    }
    // Images
    else if (line.match(/!\[.*?\]\(.*?\)/)) {
      const match = line.match(/!\[(.*?)\]\((.*?)\)/);
      if (match) {
        elements.push({
          type: "image",
          content: match[1], // alt text
          url: match[2], // image URL
          key: `img-${key++}`,
        });
      }
    }
    // Empty lines
    else if (line.trim() === "") {
      // Skip empty lines or add spacing
      continue;
    }
    // Horizontal rules
    else if (line.trim() === "---" || line.trim() === "***") {
      elements.push({
        type: "horizontal_rule",
        content: "",
        key: `hr-${key++}`,
      });
    }
    // Footnote definitions [^id]: content
    else if (line.match(/^\[\^.+\]:\s/)) {
      const match = line.match(/^\[\^(.+)\]:\s(.*)$/);
      if (match) {
        elements.push({
          type: "footnote_definition",
          content: match[2],
          footnoteId: match[1],
          key: `footnote-def-${key++}`,
        });
      }
    }
    // Definition lists - check if next line starts with :
    else if (
      line.trim() !== "" &&
      i + 1 < lines.length &&
      lines[i + 1].trim().startsWith(": ")
    ) {
      const term = line.trim();
      i++; // Move to definition line
      const definition = lines[i].trim().substring(2); // Remove ": "
      elements.push({
        type: "definition_item",
        content: definition,
        term: term,
        key: `definition-${key++}`,
      });
    }
    // Regular paragraphs
    else {
      elements.push({
        type: "paragraph",
        content: line,
        key: `p-${key++}`,
      });
    }
  }

  return elements;
};

const renderInlineMarkdown = (text: string): JSX.Element[] => {
  const elements: JSX.Element[] = [];
  let key = 0;

  // Split by footnote references first [^id]
  const footnoteRegex = /\[\^([^\]]+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = footnoteRegex.exec(text)) !== null) {
    // Add text before footnote
    if (match.index > lastIndex) {
      const beforeText = text.substring(lastIndex, match.index);
      elements.push(...renderLinksAndFormatting(beforeText, key));
    }

    // Capture footnote ID immediately
    const footnoteId = match[1];

    // Add footnote reference
    elements.push(
      <Text
        key={`footnote-ref-${key++}`}
        className="text-blue-500 text-[10px] leading-[14px]"
      >
        [{footnoteId}]
      </Text>,
    );

    lastIndex = footnoteRegex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    elements.push(...renderLinksAndFormatting(remainingText, key));
  }

  return elements;
};

const renderLinksAndFormatting = (
  text: string,
  startKey: number,
): JSX.Element[] => {
  const elements: JSX.Element[] = [];
  let key = startKey;

  // Convert autolinks like <https://example.com> into standard [url](url) format for easier parsing
  const autolinkRegex = /<((?:https?:\/\/)[^>]+)>/g;
  const processedText = text.replace(autolinkRegex, "[$1]($1)");

  // Split by links first [text](url)
  const linkRegex = /\[([^\]]+)]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(processedText)) !== null) {
    // Add text before link
    if (match.index > lastIndex) {
      const beforeText = processedText.substring(lastIndex, match.index);
      elements.push(...renderTextWithCodeAndFormatting(beforeText, key));
    }

    // Capture values immediately
    const linkText = match[1];
    const linkUrl = match[2];

    // Add link
    elements.push(
      <Text
        key={`link-${key++}`}
        className="text-blue-500 underline"
        onPress={() => {
          if (linkUrl && linkUrl.trim()) {
            // Ensure URL has a protocol
            const fullUrl = linkUrl.startsWith("http")
              ? linkUrl
              : `https://${linkUrl}`;
            Linking.openURL(fullUrl).catch((err) => {
              console.warn("Failed to open URL:");
            });
          }
        }}
      >
        {linkText}
      </Text>,
    );

    lastIndex = linkRegex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < processedText.length) {
    const remainingText = processedText.substring(lastIndex);
    elements.push(...renderTextWithCodeAndFormatting(remainingText, key));
  }

  return elements;
};

const renderTextWithCodeAndFormatting = (
  text: string,
  startKey: number,
): JSX.Element[] => {
  const elements: JSX.Element[] = [];
  let key = startKey;

  // Split by code spans first (backticks)
  const codeRegex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match;

  while ((match = codeRegex.exec(text)) !== null) {
    // Add text before code span
    if (match.index > lastIndex) {
      const beforeText = text.substring(lastIndex, match.index);
      elements.push(...renderTextWithFormatting(beforeText, key));
    }

    // Add code span with background (using Text for proper inline alignment)
    elements.push(
      <Text
        key={`code-${key++}`}
        className="text-sm font-mono bg-gray-200 px-1 py-0.5 rounded border border-gray-400 text-gray-700"
      >
        {match[1]}
      </Text>,
    );

    lastIndex = codeRegex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    elements.push(...renderTextWithFormatting(remainingText, key));
  }

  return elements;
};

const renderTextWithFormatting = (
  text: string,
  startKey: number,
): JSX.Element[] => {
  const elements: JSX.Element[] = [];
  let key = startKey;

  // Handle bold, italic, and strikethrough with both asterisks and underscores
  const parts = text.split(
    /(___[^_]+___|___[^_]+___|\*\*\*[^*]+\*\*\*|__[^_]+__|\_\_[^_]+\_\_|\*\*[^*]+\*\*|~~[^~]+~~|_[^_]+_|\*[^*]+\*)/,
  );

  parts.forEach((part, index) => {
    // Bold and italic (triple)
    if (
      (part.startsWith("___") && part.endsWith("___")) ||
      (part.startsWith("***") && part.endsWith("***"))
    ) {
      elements.push(
        <Text key={`bold-italic-${key++}`} className="font-bold italic">
          {part.slice(3, -3)}
        </Text>,
      );
    }
    // Bold (double)
    else if (
      (part.startsWith("__") && part.endsWith("__")) ||
      (part.startsWith("**") && part.endsWith("**"))
    ) {
      elements.push(
        <Text key={`bold-${key++}`} className="font-bold">
          {part.slice(2, -2)}
        </Text>,
      );
    }
    // Strikethrough
    else if (part.startsWith("~~") && part.endsWith("~~")) {
      elements.push(
        <Text key={`strikethrough-${key++}`} className="line-through">
          {part.slice(2, -2)}
        </Text>,
      );
    }
    // Italic (single)
    else if (
      (part.startsWith("_") && part.endsWith("_")) ||
      (part.startsWith("*") && part.endsWith("*"))
    ) {
      elements.push(
        <Text key={`italic-${key++}`} className="italic">
          {part.slice(1, -1)}
        </Text>,
      );
    } else if (part.trim()) {
      // Regular text
      elements.push(
        <Text key={`text-${key++}`} className="text-xl text-black">
          {part}
        </Text>,
      );
    }
  });

  return elements;
};

export const MarkdownComponent: React.FC<MarkdownProps> = ({ children }) => {
  const elements = parseMarkdown(children);

  return (
    <View>
      {elements.map((element) => {
        switch (element.type) {
          case "h1":
            return (
              <Text
                key={element.key}
                className="text-3xl font-bold mt-6 mb-4 text-black"
              >
                {renderInlineMarkdown(element.content)}
              </Text>
            );
          case "h2":
            return (
              <Text
                key={element.key}
                className="text-2xl font-bold mt-6 mb-4 text-black"
              >
                {renderInlineMarkdown(element.content)}
              </Text>
            );
          case "h3":
            return (
              <Text
                key={element.key}
                className="text-xl font-bold mt-6 mb-4 text-black"
              >
                {renderInlineMarkdown(element.content)}
              </Text>
            );
          case "h4":
            return (
              <Text
                key={element.key}
                className="text-lg font-bold mt-6 mb-4 text-black"
              >
                {renderInlineMarkdown(element.content)}
              </Text>
            );
          case "h5":
            return (
              <Text
                key={element.key}
                className="text-base font-bold mt-6 mb-4 text-black"
              >
                {renderInlineMarkdown(element.content)}
              </Text>
            );
          case "h6":
            return (
              <Text
                key={element.key}
                className="text-sm font-bold mt-6 mb-4 text-black"
              >
                {renderInlineMarkdown(element.content)}
              </Text>
            );
          case "code_block":
            return (
              <View
                key={element.key}
                className="bg-gray-100 border border-gray-300 p-3 rounded-lg my-2"
              >
                <Text className="text-black text-sm font-mono">
                  {element.content}
                </Text>
              </View>
            );
          case "blockquote":
            return (
              <View
                key={element.key}
                className="bg-gray-50 border-l-4 border-gray-300 pl-3 py-2 my-2"
              >
                <Text className="text-xl text-gray-700">
                  {renderInlineMarkdown(element.content)}
                </Text>
              </View>
            );
          case "list_item": {
            const indentMap = [
              "ml-4",
              "ml-8",
              "ml-12",
              "ml-16",
              "ml-20",
              "ml-24",
              "ml-28",
              "ml-32",
              "ml-36",
              "ml-40",
            ] as const;
            const indentClass = indentMap[element.indentLevel ?? 0] ?? "ml-4";
            return (
              <View
                key={element.key}
                className={`flex-row mb-1 ${indentClass}`}
              >
                <Text className="text-xl text-black mr-2">•</Text>
                <Text className="text-xl text-black flex-1">
                  {renderInlineMarkdown(element.content)}
                </Text>
              </View>
            );
          }
          case "checklist_item":
            return (
              <View key={element.key} className="flex-row mb-1 ml-4">
                <View
                  className={`mr-2 mt-1 w-[18px] h-[18px] border-2 rounded-[3px] items-center justify-center ${element.checked ? "border-emerald-500 bg-emerald-500" : "border-gray-400"}`}
                >
                  {element.checked && (
                    <Text className="text-white text-xs font-bold">✓</Text>
                  )}
                </View>
                <Text className="text-xl text-black flex-1">
                  {renderInlineMarkdown(element.content)}
                </Text>
              </View>
            );
          case "numbered_item": {
            const indentMap = [
              "ml-4",
              "ml-8",
              "ml-12",
              "ml-16",
              "ml-20",
              "ml-24",
              "ml-28",
              "ml-32",
              "ml-36",
              "ml-40",
            ] as const;
            const indentClass = indentMap[element.indentLevel ?? 0] ?? "ml-4";
            return (
              <View
                key={element.key}
                className={`flex-row mb-1 ${indentClass}`}
              >
                <Text className="text-xl text-black mr-2">
                  {element.number}.
                </Text>
                <Text className="text-xl text-black flex-1">
                  {renderInlineMarkdown(element.content)}
                </Text>
              </View>
            );
          }
          case "image":
            return (
              <View key={element.key} className="my-2">
                {element.url ? (
                  <Image
                    source={{ uri: element.url }}
                    className="w-full h-48 rounded-lg"
                    resizeMode="contain"
                  />
                ) : (
                  <View className="bg-gray-200 p-4 rounded-lg">
                    <Text className="text-gray-600 text-center">
                      Image could not be loaded
                    </Text>
                  </View>
                )}
                {element.content && (
                  <Text className="text-sm text-gray-600 mt-1 text-center">
                    {element.content}
                  </Text>
                )}
              </View>
            );
          case "horizontal_rule":
            return (
              <View
                key={element.key}
                className="border-t border-gray-300 my-4"
              />
            );
          case "table":
            return (
              <View key={element.key} className="my-4">
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="grow-0"
                >
                  <View className="border border-gray-300 rounded-lg overflow-hidden">
                    {(() => {
                      // Calculate column widths based on content
                      const columnWidths: number[] = [];
                      const minColumnWidth = 100;
                      const maxColumnWidth = 200;

                      if (element.headers) {
                        element.headers.forEach((header, index) => {
                          let maxWidth = Math.max(
                            header.length * 8,
                            minColumnWidth,
                          );

                          // Check all rows for this column
                          element.rows?.forEach((row) => {
                            if (row[index]) {
                              maxWidth = Math.max(
                                maxWidth,
                                row[index].length * 8,
                              );
                            }
                          });

                          columnWidths[index] = Math.min(
                            maxWidth,
                            maxColumnWidth,
                          );
                        });
                      }

                      return (
                        <>
                          {/* Table Header */}
                          <View className="flex-row bg-gray-100">
                            {element.headers?.map((header, index) => (
                              <View
                                key={`header-${index}`}
                                className={`p-3 w-[${columnWidths[index] || 120}] ${index < (element.headers?.length || 0) - 1 ? "border-r border-gray-300" : ""}`}
                              >
                                <Text className="text-base font-bold text-black">
                                  {header}
                                </Text>
                              </View>
                            ))}
                          </View>
                          {/* Table Rows */}
                          {element.rows?.map((row, rowIndex) => (
                            <View
                              key={`row-${rowIndex}`}
                              className="flex-row border-t border-gray-200"
                            >
                              {row.map((cell, cellIndex) => (
                                <View
                                  key={`cell-${rowIndex}-${cellIndex}`}
                                  className={`p-3 w-[${columnWidths[cellIndex] || 120}] ${cellIndex < row.length - 1 ? "border-r border-gray-200" : ""}`}
                                >
                                  <Text className="text-base text-black">
                                    {renderInlineMarkdown(cell)}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          ))}
                        </>
                      );
                    })()}
                  </View>
                </ScrollView>
              </View>
            );
          case "footnote_definition":
            return (
              <View
                key={element.key}
                className="bg-gray-50 p-3 my-2 rounded-lg border-l-4 border-blue-300"
              >
                <Text className="text-base text-gray-700">
                  <Text className="font-bold text-gray-600">
                    [{element.footnoteId}]{" "}
                  </Text>
                  {renderInlineMarkdown(element.content)}
                </Text>
              </View>
            );
          case "definition_item":
            return (
              <View key={element.key} className="mb-3">
                <Text className="text-lg font-bold text-black mb-1">
                  {element.term}
                </Text>
                <Text className="text-base text-gray-700 ml-4">
                  {renderInlineMarkdown(element.content)}
                </Text>
              </View>
            );
          case "paragraph":
          default:
            return (
              <Text key={element.key} className="text-xl text-black">
                {renderInlineMarkdown(element.content)}
              </Text>
            );
        }
      })}
    </View>
  );
};
