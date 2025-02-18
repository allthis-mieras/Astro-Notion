import { Client } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import type { Issue } from './types';
import fs from 'fs';
import fetch from 'node-fetch';

const notion = new Client({
  auth: import.meta.env.NOTION_TOKEN,
});

async function downloadImage(url: string, filepath: string): Promise<void> {
  const response = await fetch(url);
  const dest = fs.createWriteStream(filepath);
  response.body.pipe(dest);
  return new Promise((resolve, reject) => {
    response.body.on('end', resolve);
    dest.on('error', reject);
  });
}

export async function getIssues(): Promise<Issue[]> {
  const response = await notion.databases.query({
    database_id: import.meta.env.NOTION_DATABASE_ID,
    filter: {
      and: [
        {
          property: "published",
          checkbox: {
            equals: true,
          },
        },
        {
          property: "date",
          date: {
            on_or_before: new Date().toISOString(),
          },
        },
      ],
    },
    sorts: [
      {
        property: 'title',
        direction: 'ascending',
      },
    ],
  });

  const issues = await Promise.all(response.results.map(async (issue) => {
    const coverUrl = issue.properties.cover?.files[0]?.file?.url;
    const coverName = issue.properties.cover?.files[0]?.name;
    if (coverUrl && coverName) {
      await downloadImage(coverUrl, `./public/images/${coverName}`);
    }

    return {
      id: issue.id,
      coverUrl: coverName ? `/images/${coverName}` : undefined,
      title: issue.properties.title.title[0].plain_text,
      date: new Date(issue.properties.date.date.start).toLocaleDateString(),
      uniqueId: issue.properties.id.unique_id.number,
      description: issue.properties.description?.rich_text?.[0]?.plain_text,
      raw: issue,
    };
  }));

  return issues as Issue[];
}

export async function getIssue(pageId: string): Promise<{ page: Issue; blocks: any[] }> {
  const page = await notion.pages.retrieve({ page_id: pageId }) as PageObjectResponse;
  const blocks = await notion.blocks.children.list({ block_id: pageId });

  const coverUrl = page.properties.cover?.files[0]?.file?.url;
  const coverName = page.properties.cover?.files[0]?.name;
  if (coverUrl && coverName) {
    await downloadImage(coverUrl, `./public/images/${coverName}`);
  }

  const issue: Issue = {
    id: page.id,
    coverUrl: coverName ? `/images/${coverName}` : undefined,
    title: page.properties.title.title[0].plain_text,
    date: new Date(page.properties.date.date.start).toLocaleDateString(),
    uniqueId: page.properties.id.unique_id.number,
    description: page.properties.description?.rich_text?.[0]?.plain_text,
    raw: page,
  };

  return {
    page: issue,
    blocks: blocks.results,
  };
}