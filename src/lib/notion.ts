import { Client } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

const notion = new Client({
  auth: import.meta.env.NOTION_TOKEN,
});

export async function getIssues() {
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

  return response.results as PageObjectResponse[];
}

export async function getIssue(pageId: string) {
  const page = await notion.pages.retrieve({ page_id: pageId });
  const blocks = await notion.blocks.children.list({ block_id: pageId });
  
  return {
    page: page as PageObjectResponse,
    blocks: blocks.results,
  };
}