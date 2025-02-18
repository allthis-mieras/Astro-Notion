import { Client } from '@notionhq/client';
import type { PageObjectResponse, BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import type { Issue } from './types';
import fs from 'fs';
import fetch from 'node-fetch';

interface NotionPageProperties {
  cover?: { files: { file: { url: string }; name: string }[] };
  title: { title: { plain_text: string }[] };
  date: { date: { start: string } };
  id: { unique_id: { number: number } };
  description?: { rich_text: { plain_text: string }[] };
}

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

function isFullPage(
  page: PageObjectResponse | Partial<PageObjectResponse>
): page is PageObjectResponse {
  return 'properties' in page;
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
    if (!isFullPage(issue)) {
      throw new Error('Incomplete page data');
    }

    const properties = issue.properties as NotionPageProperties;
    const coverUrl = properties.cover?.files[0]?.file?.url;
    const coverName = properties.cover?.files[0]?.name;
    if (coverUrl && coverName) {
      await downloadImage(coverUrl, `./public/images/${coverName}`);
    }

    return {
      id: issue.id,
      coverUrl: coverName ? `/images/${coverName}` : undefined,
      title: properties.title.title[0].plain_text,
      date: new Date(properties.date.date.start).toLocaleDateString(),
      uniqueId: properties.id.unique_id.number,
      description: properties.description?.rich_text?.[0]?.plain_text,
      raw: issue,
    };
  }));

  return issues as Issue[];
}

export async function getIssue(pageId: string): Promise<{ page: Issue; blocks: BlockObjectResponse[] }> {
  const page = await notion.pages.retrieve({ page_id: pageId }) as PageObjectResponse;
  const blocks = await notion.blocks.children.list({ block_id: pageId });

  if (!isFullPage(page)) {
    throw new Error('Incomplete page data');
  }

  const properties = page.properties as NotionPageProperties;
  const coverUrl = properties.cover?.files[0]?.file?.url;
  const coverName = properties.cover?.files[0]?.name;
  if (coverUrl && coverName) {
    await downloadImage(coverUrl, `./public/images/${coverName}`);
  }

  const issue: Issue = {
    id: page.id,
    coverUrl: coverName ? `/images/${coverName}` : undefined,
    title: properties.title.title[0].plain_text,
    date: new Date(properties.date.date.start).toLocaleDateString(),
    uniqueId: properties.id.unique_id.number,
    description: properties.description?.rich_text?.[0]?.plain_text,
    raw: page,
  };

  return {
    page: issue,
    blocks: blocks.results as BlockObjectResponse[],
  };
}