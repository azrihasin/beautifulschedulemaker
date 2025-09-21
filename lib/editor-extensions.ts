import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { JSONContent } from '@/stores/types';

// Mention extension for @mentions
export const Mention = Mark.create({
  name: 'mention',

  addOptions() {
    return {
      HTMLAttributes: {},
      renderLabel({ options, node }: { options: any; node: any }) {
        return `${options.suggestion.char}${node.attrs.label ?? node.attrs.id}`;
      },
      suggestion: {
        char: '@',
        pluginKey: new PluginKey('mention'),
        allowSpaces: false,
      },
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => {
          if (!attributes.id) {
            return {};
          }
          return {
            'data-id': attributes.id,
          };
        },
      },
      label: {
        default: null,
        parseHTML: element => element.getAttribute('data-label'),
        renderHTML: attributes => {
          if (!attributes.label) {
            return {};
          }
          return {
            'data-label': attributes.label,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `span[data-type="${this.name}"]`,
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return [
      'span',
      mergeAttributes(
        { 'data-type': this.name },
        this.options.HTMLAttributes,
        HTMLAttributes,
        {
          class: 'mention bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-sm font-medium',
        }
      ),
      '@mention',
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('mention-decoration'),
        props: {
          decorations: (state) => {
            const decorations: Decoration[] = [];
            const doc = state.doc;

            doc.descendants((node, pos) => {
              if (node.isText) {
                const text = node.text || '';
                const mentionRegex = /@[a-zA-Z][\w-]*/g; // Must start with letter
                let match;

                while ((match = mentionRegex.exec(text)) !== null) {
                  const start = pos + match.index;
                  const end = start + match[0].length;
                  
                  decorations.push(
                    Decoration.inline(start, end, {
                      class: 'mention bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-sm font-medium',
                    })
                  );
                }
              }
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});

// Hashtag extension for #hashtags
export const Hashtag = Mark.create({
  name: 'hashtag',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      tag: {
        default: null,
        parseHTML: element => element.getAttribute('data-tag'),
        renderHTML: attributes => {
          if (!attributes.tag) {
            return {};
          }
          return {
            'data-tag': attributes.tag,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `span[data-type="${this.name}"]`,
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return [
      'span',
      mergeAttributes(
        { 'data-type': this.name },
        this.options.HTMLAttributes,
        HTMLAttributes,
        {
          class: 'hashtag bg-green-100 text-green-800 px-1 py-0.5 rounded text-sm font-medium',
        }
      ),
      '#hashtag',
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('hashtag-decoration'),
        props: {
          decorations: (state) => {
            const decorations: Decoration[] = [];
            const doc = state.doc;

            doc.descendants((node, pos) => {
              if (node.isText) {
                const text = node.text || '';
                const hashtagRegex = /#[a-zA-Z][\w-]*/g; // Must start with letter
                let match;

                while ((match = hashtagRegex.exec(text)) !== null) {
                  const start = pos + match.index;
                  const end = start + match[0].length;
                  
                  decorations.push(
                    Decoration.inline(start, end, {
                      class: 'hashtag bg-green-100 text-green-800 px-1 py-0.5 rounded text-sm font-medium',
                    })
                  );
                }
              }
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});

// Utility function to extract tags from content
export function extractTagsFromContent(content: JSONContent): string[] {
  const tags: string[] = [];
  
  if (!content || !content.content || !Array.isArray(content.content)) return tags;

  const extractFromNode = (node: any) => {
    if (!node) return;
    
    if (node.type === 'text' && node.text) {
      // Extract @mentions (must start with letter)
      const mentions = node.text.match(/@[a-zA-Z][\w-]*/g) || [];
      tags.push(...mentions);
      
      // Extract #hashtags (must start with letter)
      const hashtags = node.text.match(/#[a-zA-Z][\w-]*/g) || [];
      tags.push(...hashtags);
    }
    
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(extractFromNode);
    }
  };

  content.content.forEach(extractFromNode);
  
  // Remove duplicates and return
  return [...new Set(tags)];
}