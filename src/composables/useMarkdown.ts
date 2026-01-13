import type { Frontmatter } from '@/types'

export function useMarkdown() {
  /**
   * Parse YAML frontmatter from markdown content
   */
  function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
    const trimmed = content.trim()
    
    if (!trimmed.startsWith('---')) {
      return { frontmatter: {}, body: content }
    }

    const parts = trimmed.split('---')
    if (parts.length < 3) {
      return { frontmatter: {}, body: content }
    }

    const yamlStr = parts[1].trim()
    const body = parts.slice(2).join('---').trim()

    try {
      // Simple YAML parsing (for basic key: value pairs)
      const frontmatter: Frontmatter = {}
      const lines = yamlStr.split('\n')
      
      for (const line of lines) {
        const [key, ...valueParts] = line.split(':')
        if (key && valueParts.length > 0) {
          const value = valueParts.join(':').trim()
          // Handle arrays
          if (value.startsWith('[') && value.endsWith(']')) {
            frontmatter[key.trim()] = JSON.parse(value.replace(/'/g, '"'))
          } else if (value === 'true' || value === 'false') {
            frontmatter[key.trim()] = value === 'true'
          } else if (!isNaN(Number(value))) {
            frontmatter[key.trim()] = Number(value)
          } else {
            // Remove quotes if present
            frontmatter[key.trim()] = value.replace(/^["']|["']$/g, '')
          }
        }
      }

      return { frontmatter, body }
    } catch {
      return { frontmatter: {}, body: content }
    }
  }

  /**
   * Serialize frontmatter and body back to markdown
   */
  function serializeMarkdown(frontmatter: Frontmatter, body: string): string {
    if (Object.keys(frontmatter).length === 0) {
      return body
    }

    const yamlLines = Object.entries(frontmatter)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}: [${value.map(v => `"${v}"`).join(', ')}]`
        }
        if (typeof value === 'string' && value.includes(':')) {
          return `${key}: "${value}"`
        }
        return `${key}: ${value}`
      })

    return `---\n${yamlLines.join('\n')}\n---\n\n${body}`
  }

  /**
   * Extract wikilinks from markdown content
   */
  function extractWikilinks(content: string): string[] {
    const regex = /\[\[([^\]]+)\]\]/g
    const links: string[] = []
    let match

    while ((match = regex.exec(content)) !== null) {
      links.push(match[1])
    }

    return links
  }

  /**
   * Extract tags from frontmatter or content
   */
  function extractTags(content: string, frontmatter: Frontmatter): string[] {
    const tags = new Set<string>()

    // Add frontmatter tags
    if (frontmatter.tags && Array.isArray(frontmatter.tags)) {
      frontmatter.tags.forEach(tag => tags.add(tag))
    }

    // Extract inline tags (#tag)
    const regex = /#([a-zA-Z0-9_-]+)/g
    let match
    while ((match = regex.exec(content)) !== null) {
      tags.add(match[1])
    }

    return Array.from(tags)
  }

  /**
   * Convert markdown to HTML (for Tiptap editor)
   */
  function markdownToHtml(content: string): string {
    const lines = content.split('\n')
    const result: string[] = []
    let inList = false
    let inOrderedList = false
    let inCodeBlock = false
    let codeContent: string[] = []

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i]

      // Code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          result.push(`<pre><code>${codeContent.join('\n')}</code></pre>`)
          codeContent = []
          inCodeBlock = false
        } else {
          inCodeBlock = true
        }
        continue
      }

      if (inCodeBlock) {
        codeContent.push(line)
        continue
      }

      // Close lists if line doesn't match
      if (inList && !line.match(/^[-*] /)) {
        result.push('</ul>')
        inList = false
      }
      if (inOrderedList && !line.match(/^\d+\. /)) {
        result.push('</ol>')
        inOrderedList = false
      }

    // Headers
      if (line.startsWith('### ')) {
        result.push(`<h3>${processInline(line.slice(4))}</h3>`)
        continue
      }
      if (line.startsWith('## ')) {
        result.push(`<h2>${processInline(line.slice(3))}</h2>`)
        continue
      }
      if (line.startsWith('# ')) {
        result.push(`<h1>${processInline(line.slice(2))}</h1>`)
        continue
      }

      // Task lists
      if (line.match(/^- \[[ x]\] /)) {
        if (!inList) {
          result.push('<ul data-type="taskList">')
          inList = true
        }
        const checked = line.includes('[x]')
        const text = line.replace(/^- \[[ x]\] /, '')
        result.push(`<li data-type="taskItem" data-checked="${checked}"><label><input type="checkbox" ${checked ? 'checked' : ''}></label><div><p>${processInline(text)}</p></div></li>`)
        continue
      }

      // Unordered lists
      if (line.match(/^[-*] /)) {
        if (!inList) {
          result.push('<ul>')
          inList = true
        }
        result.push(`<li><p>${processInline(line.slice(2))}</p></li>`)
        continue
      }

      // Ordered lists
      if (line.match(/^\d+\. /)) {
        if (!inOrderedList) {
          result.push('<ol>')
          inOrderedList = true
        }
        result.push(`<li><p>${processInline(line.replace(/^\d+\. /, ''))}</p></li>`)
        continue
      }

      // Blockquote
      if (line.startsWith('> ')) {
        result.push(`<blockquote><p>${processInline(line.slice(2))}</p></blockquote>`)
        continue
      }

      // Horizontal rule
      if (line.match(/^---+$/)) {
        result.push('<hr>')
        continue
      }

      // Empty line = paragraph break
      if (line.trim() === '') {
        result.push('')
        continue
      }

      // Regular paragraph
      result.push(`<p>${processInline(line)}</p>`)
    }

    // Close any open lists
    if (inList) result.push('</ul>')
    if (inOrderedList) result.push('</ol>')

    return result.join('')
  }

  /**
   * Process inline markdown (bold, italic, code, links)
   */
  function processInline(text: string): string {
    let result = text

    // Code (inline)
    result = result.replace(/`([^`]+)`/g, '<code>$1</code>')

    // Bold
    result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

    // Italic
    result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>')

    // Links
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

    // Wikilinks
    result = result.replace(/\[\[([^\]]+)\]\]/g, '<a class="wikilink" data-link="$1">$1</a>')

    return result
  }

  /**
   * Get title from markdown content (first H1 or filename)
   */
  function getTitle(content: string, filename: string): string {
    const match = content.match(/^#\s+(.+)$/m)
    return match ? match[1] : filename
  }

  return {
    parseFrontmatter,
    serializeMarkdown,
    extractWikilinks,
    extractTags,
    markdownToHtml,
    processInline,
    getTitle,
  }
}
