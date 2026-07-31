import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getArticles } from '../../lib/sheets';

export async function GET(context: APIContext) {
  const articles = await getArticles('id');

  return rss({
    title: 'Kukode Blog',
    description: 'Tips & insight seputar web development dari Kukode.',
    site: context.site ?? 'https://domain.com',
    items: articles.map((article) => ({
      title: article.title,
      description: article.excerpt,
      pubDate: new Date(article.published_date),
      link: `/id/article/${article.slug}/`,
    })),
  });
}
