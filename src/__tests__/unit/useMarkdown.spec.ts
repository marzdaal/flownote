import { describe, it, expect } from 'vitest'
import { useMarkdown } from '@/composables/useMarkdown'

describe('useMarkdown', () => {
  const {
    parseFrontmatter,
    serializeMarkdown,
    extractWikilinks,
    extractTags,
    markdownToHtml,
    getTitle,
  } = useMarkdown()

  describe('parseFrontmatter', () => {
    it('should parse valid YAML frontmatter', () => {
      const content = `---
status: next-action
priority: high
area: work
---

# My Task

Some content here.`

      const result = parseFrontmatter(content)

      expect(result.frontmatter).toEqual({
        status: 'next-action',
        priority: 'high',
        area: 'work',
      })
      expect(result.body).toBe('# My Task\n\nSome content here.')
    })

    it('should handle content without frontmatter', () => {
      const content = '# Just a heading\n\nNo frontmatter here.'

      const result = parseFrontmatter(content)

      expect(result.frontmatter).toEqual({})
      expect(result.body).toBe(content)
    })

    it('should handle empty content', () => {
      const result = parseFrontmatter('')

      expect(result.frontmatter).toEqual({})
      expect(result.body).toBe('')
    })

    it('should parse arrays in frontmatter', () => {
      const content = `---
tags: ["work", "urgent"]
---

Content`

      const result = parseFrontmatter(content)

      expect(result.frontmatter.tags).toEqual(['work', 'urgent'])
    })

    it('should parse boolean values', () => {
      const content = `---
completed: true
archived: false
---

Content`

      const result = parseFrontmatter(content)

      expect(result.frontmatter.completed).toBe(true)
      expect(result.frontmatter.archived).toBe(false)
    })

    it('should parse numeric values', () => {
      const content = `---
priority: 1
score: 95.5
---

Content`

      const result = parseFrontmatter(content)

      expect(result.frontmatter.priority).toBe(1)
      expect(result.frontmatter.score).toBe(95.5)
    })

    it('should handle values with colons', () => {
      const content = `---
time: 10:30
url: https://example.com
---

Content`

      const result = parseFrontmatter(content)

      expect(result.frontmatter.time).toBe('10:30')
      expect(result.frontmatter.url).toBe('https://example.com')
    })

    it('should handle incomplete frontmatter (missing closing delimiter)', () => {
      // Note: The implementation treats this as valid frontmatter
      // because it splits by '---' and finds 3+ parts
      const content = `---
status: active

# Content without closing ---`

      const result = parseFrontmatter(content)

      // Implementation parses what it can find between first two ---
      expect(result.frontmatter.status).toBe('active')
    })

    it('should handle frontmatter with quoted strings', () => {
      const content = `---
title: "My Title"
description: 'Single quoted'
---

Content`

      const result = parseFrontmatter(content)

      expect(result.frontmatter.title).toBe('My Title')
      expect(result.frontmatter.description).toBe('Single quoted')
    })

    it('should handle multiple --- in body content', () => {
      const content = `---
status: active
---

# Title

Some content

---

More content after horizontal rule`

      const result = parseFrontmatter(content)

      expect(result.frontmatter.status).toBe('active')
      expect(result.body).toContain('---')
      expect(result.body).toContain('More content after horizontal rule')
    })
  })

  describe('serializeMarkdown', () => {
    it('should serialize frontmatter and body', () => {
      const frontmatter = {
        status: 'active',
        priority: 'high',
      }
      const body = '# My Note\n\nContent here.'

      const result = serializeMarkdown(frontmatter, body)

      expect(result).toContain('---')
      expect(result).toContain('status: active')
      expect(result).toContain('priority: high')
      expect(result).toContain('# My Note')
    })

    it('should return only body when frontmatter is empty', () => {
      const frontmatter = {}
      const body = '# My Note\n\nContent here.'

      const result = serializeMarkdown(frontmatter, body)

      expect(result).toBe(body)
      expect(result).not.toContain('---')
    })

    it('should serialize arrays correctly', () => {
      const frontmatter = {
        tags: ['work', 'urgent'],
      }
      const body = 'Content'

      const result = serializeMarkdown(frontmatter, body)

      expect(result).toContain('tags: ["work", "urgent"]')
    })

    it('should quote strings with colons', () => {
      const frontmatter = {
        url: 'https://example.com',
      }
      const body = 'Content'

      const result = serializeMarkdown(frontmatter, body)

      expect(result).toContain('url: "https://example.com"')
    })

    it('should skip null and undefined values', () => {
      const frontmatter = {
        status: 'active',
        due: null,
        priority: undefined,
        area: '',
      }
      const body = 'Content'

      const result = serializeMarkdown(frontmatter, body)

      expect(result).toContain('status: active')
      expect(result).not.toContain('due')
      expect(result).not.toContain('priority')
      expect(result).not.toContain('area')
    })
  })

  describe('extractWikilinks', () => {
    it('should extract single wikilink', () => {
      const content = 'See [[My Note]] for details.'

      const result = extractWikilinks(content)

      expect(result).toEqual(['My Note'])
    })

    it('should extract multiple wikilinks', () => {
      const content = 'Related: [[Note 1]] and [[Note 2]] and [[Note 3]]'

      const result = extractWikilinks(content)

      expect(result).toEqual(['Note 1', 'Note 2', 'Note 3'])
    })

    it('should return empty array when no wikilinks', () => {
      const content = 'No links here, just [regular](markdown) links.'

      const result = extractWikilinks(content)

      expect(result).toEqual([])
    })

    it('should handle wikilinks with special characters', () => {
      const content = 'See [[My Project - Phase 1]] for details.'

      const result = extractWikilinks(content)

      expect(result).toEqual(['My Project - Phase 1'])
    })

    it('should handle empty content', () => {
      const result = extractWikilinks('')

      expect(result).toEqual([])
    })

    it('should handle wikilinks on multiple lines', () => {
      const content = `# Title

See [[Note 1]] here.

Also [[Note 2]] there.`

      const result = extractWikilinks(content)

      expect(result).toEqual(['Note 1', 'Note 2'])
    })
  })

  describe('extractTags', () => {
    it('should extract tags from frontmatter', () => {
      const content = 'Some content'
      const frontmatter = { tags: ['work', 'urgent'] }

      const result = extractTags(content, frontmatter)

      expect(result).toContain('work')
      expect(result).toContain('urgent')
    })

    it('should extract inline tags from content', () => {
      const content = 'This is #important and #urgent task'
      const frontmatter = {}

      const result = extractTags(content, frontmatter)

      expect(result).toContain('important')
      expect(result).toContain('urgent')
    })

    it('should combine frontmatter and inline tags', () => {
      const content = 'This is #inline tagged'
      const frontmatter = { tags: ['frontmatter'] }

      const result = extractTags(content, frontmatter)

      expect(result).toContain('frontmatter')
      expect(result).toContain('inline')
    })

    it('should deduplicate tags', () => {
      const content = 'This is #work related'
      const frontmatter = { tags: ['work'] }

      const result = extractTags(content, frontmatter)

      expect(result.filter(t => t === 'work')).toHaveLength(1)
    })

    it('should handle missing tags in frontmatter', () => {
      const content = 'No inline tags here'
      const frontmatter = {}

      const result = extractTags(content, frontmatter)

      expect(result).toEqual([])
    })

    it('should extract tags with dashes and underscores', () => {
      const content = 'Tags: #my-tag and #my_tag'
      const frontmatter = {}

      const result = extractTags(content, frontmatter)

      expect(result).toContain('my-tag')
      expect(result).toContain('my_tag')
    })
  })

  describe('markdownToHtml', () => {
    it('should convert headings', () => {
      const content = '# H1\n## H2\n### H3'

      const result = markdownToHtml(content)

      expect(result).toContain('<h1>H1</h1>')
      expect(result).toContain('<h2>H2</h2>')
      expect(result).toContain('<h3>H3</h3>')
    })

    it('should convert bold text', () => {
      const content = 'This is **bold** text'

      const result = markdownToHtml(content)

      expect(result).toContain('<strong>bold</strong>')
    })

    it('should convert italic text', () => {
      const content = 'This is *italic* text'

      const result = markdownToHtml(content)

      expect(result).toContain('<em>italic</em>')
    })

    it('should convert standard links', () => {
      const content = 'Visit [Google](https://google.com)'

      const result = markdownToHtml(content)

      expect(result).toContain('<a href="https://google.com">Google</a>')
    })

    it('should convert wikilinks to anchor tags', () => {
      const content = 'See [[My Note]] for details'

      const result = markdownToHtml(content)

      expect(result).toContain('class="wikilink"')
      expect(result).toContain('data-link="My Note"')
    })

    it('should convert lines to paragraphs', () => {
      const content = 'Line 1\nLine 2'

      const result = markdownToHtml(content)

      expect(result).toContain('<p>Line 1</p>')
      expect(result).toContain('<p>Line 2</p>')
    })
  })

  describe('getTitle', () => {
    it('should extract title from H1 heading', () => {
      const content = '# My Title\n\nSome content'

      const result = getTitle(content, 'fallback.md')

      expect(result).toBe('My Title')
    })

    it('should return filename when no H1 found', () => {
      const content = 'Just content without heading'

      const result = getTitle(content, 'fallback.md')

      expect(result).toBe('fallback.md')
    })

    it('should handle H1 not at start of content', () => {
      const content = 'Some preamble\n# The Title\n\nContent'

      const result = getTitle(content, 'fallback.md')

      expect(result).toBe('The Title')
    })

    it('should not match H2 or lower as title', () => {
      const content = '## H2 Title\n### H3 Title'

      const result = getTitle(content, 'fallback.md')

      expect(result).toBe('fallback.md')
    })

    it('should handle empty content', () => {
      const result = getTitle('', 'fallback.md')

      expect(result).toBe('fallback.md')
    })
  })
})
